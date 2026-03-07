-- Migration: Add audit trigger functions
-- Auto-logs INSERT/UPDATE/DELETE mutations on student_profiles, orders, and transactions
-- into the audit_logs table with old/new data and operation metadata

-- ============================================================
-- SHARED AUDIT LOGGER FUNCTION
-- ============================================================
-- Single reusable function called by all table-specific triggers.
-- Captures TG_OP (INSERT/UPDATE/DELETE), table name, row IDs,
-- old/new JSONB snapshots, and the acting user from auth.uid().

CREATE OR REPLACE FUNCTION public.log_table_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_action       TEXT;
    v_resource_id  TEXT;
    v_old_data     JSONB;
    v_new_data     JSONB;
    v_user_id      UUID;
    v_severity     TEXT;
BEGIN
    -- Determine action label
    v_action := TG_OP; -- 'INSERT', 'UPDATE', or 'DELETE'

    -- Capture old / new row snapshots
    IF TG_OP = 'DELETE' THEN
        v_old_data    := to_jsonb(OLD);
        v_new_data    := NULL;
        v_resource_id := OLD.id::TEXT;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_data    := NULL;
        v_new_data    := to_jsonb(NEW);
        v_resource_id := NEW.id::TEXT;
    ELSE -- UPDATE
        v_old_data    := to_jsonb(OLD);
        v_new_data    := to_jsonb(NEW);
        v_resource_id := NEW.id::TEXT;
    END IF;

    -- Resolve acting user: prefer auth.uid(), fall back to row-level user_id
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        -- Try to extract user_id from the row itself (present on all three tables)
        IF TG_OP = 'DELETE' THEN
            v_user_id := OLD.user_id;
        ELSE
            v_user_id := NEW.user_id;
        END IF;
    END IF;

    -- Assign severity based on operation type
    IF TG_OP = 'DELETE' THEN
        v_severity := 'warning';
    ELSIF TG_OP = 'UPDATE' THEN
        v_severity := 'info';
    ELSE
        v_severity := 'info';
    END IF;

    -- Insert audit log row
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_data,
        new_data,
        metadata,
        severity,
        created_at
    ) VALUES (
        v_user_id,
        v_action,
        TG_TABLE_NAME,
        v_resource_id,
        v_old_data,
        v_new_data,
        jsonb_build_object(
            'schema',     TG_TABLE_SCHEMA,
            'table',      TG_TABLE_NAME,
            'operation',  TG_OP,
            'trigger',    TG_NAME,
            'logged_at',  CURRENT_TIMESTAMP
        ),
        v_severity,
        CURRENT_TIMESTAMP
    );

    -- Return appropriate row to satisfy trigger contract
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Never block the originating DML; log failure silently
        RAISE WARNING 'audit trigger failed on %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
END;
$func$;

-- ============================================================
-- TRIGGER: student_profiles
-- ============================================================
DROP TRIGGER IF EXISTS audit_student_profiles_mutations ON public.student_profiles;
CREATE TRIGGER audit_student_profiles_mutations
    AFTER INSERT OR UPDATE OR DELETE
    ON public.student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_table_mutation();

-- ============================================================
-- TRIGGER: orders
-- ============================================================
DROP TRIGGER IF EXISTS audit_orders_mutations ON public.orders;
CREATE TRIGGER audit_orders_mutations
    AFTER INSERT OR UPDATE OR DELETE
    ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.log_table_mutation();

-- ============================================================
-- TRIGGER: transactions (payments)
-- ============================================================
DROP TRIGGER IF EXISTS audit_transactions_mutations ON public.transactions;
CREATE TRIGGER audit_transactions_mutations
    AFTER INSERT OR UPDATE OR DELETE
    ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.log_table_mutation();
