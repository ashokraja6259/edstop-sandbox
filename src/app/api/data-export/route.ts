// FILE: src/app/api/data-export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const dataTypes =
      searchParams.get('types')?.split(',') || ['profile', 'orders', 'activity'];

    const exportData: Record<string, any> = {};

    if (dataTypes.includes('profile')) {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      exportData.profile = {
        auth: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          phone: user.phone || null,
          full_name: user.user_metadata?.full_name || null,
        },
        student_profile: profile || null,
        user_profile: userProfile || null,
      };
    }

    if (dataTypes.includes('orders')) {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      exportData.orders = orders || [];
    }

    if (dataTypes.includes('activity')) {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('id, action, resource_type, resource_id, metadata, severity, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      exportData.activity = {
        transactions: transactions || [],
        audit_logs: auditLogs || [],
      };
    }

    const gdprMetadata = {
      export_id: `export_${user.id}_${Date.now()}`,
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      user_id: user.id,
      data_controller: 'EdStop Platform, IIT Kharagpur',
      data_processor: 'EdStop Technology Services',
      legal_basis: 'Article 20 GDPR — Right to Data Portability',
      retention_policy:
        'Data is retained for 3 years after account closure per institutional policy',
      data_categories: dataTypes,
      format,
      schema_version: '1.0.0',
      contact: 'privacy@edstop.iitkgp.ac.in',
      note:
        'This export contains your personal data as stored by EdStop. You have the right to request deletion under GDPR Article 17.',
    };

    const fullExport = {
      gdpr_metadata: gdprMetadata,
      data: exportData,
    };

    if (format === 'csv') {
      const csvSections: string[] = [];

      csvSections.push('# GDPR DATA EXPORT');
      csvSections.push(`# Exported At: ${gdprMetadata.exported_at}`);
      csvSections.push(`# Export ID: ${gdprMetadata.export_id}`);
      csvSections.push(`# Legal Basis: ${gdprMetadata.legal_basis}`);
      csvSections.push(`# Data Controller: ${gdprMetadata.data_controller}`);
      csvSections.push('');

      if (exportData.profile) {
        csvSections.push('## PROFILE DATA');
        const authFields = exportData.profile.auth;
        csvSections.push(Object.keys(authFields).join(','));
        csvSections.push(
          Object.values(authFields)
            .map((v: any) =>
              v === null || v === undefined ? '' : `"${String(v).replace(/"/g, '""')}"`
            )
            .join(',')
        );
        csvSections.push('');
      }

      if (exportData.orders && exportData.orders.length > 0) {
        csvSections.push('## ORDERS DATA');
        const orderKeys = Object.keys(exportData.orders[0]);
        csvSections.push(orderKeys.join(','));
        exportData.orders.forEach((order: any) => {
          csvSections.push(
            orderKeys
              .map((k) => {
                const v = order[k];
                if (v === null || v === undefined) return '';
                if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
                return `"${String(v).replace(/"/g, '""')}"`;
              })
              .join(',')
          );
        });
        csvSections.push('');
      }

      if (exportData.activity?.transactions?.length > 0) {
        csvSections.push('## TRANSACTIONS DATA');
        const txKeys = Object.keys(exportData.activity.transactions[0]);
        csvSections.push(txKeys.join(','));
        exportData.activity.transactions.forEach((tx: any) => {
          csvSections.push(
            txKeys
              .map((k) => {
                const v = tx[k];
                if (v === null || v === undefined) return '';
                if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
                return `"${String(v).replace(/"/g, '""')}"`;
              })
              .join(',')
          );
        });
        csvSections.push('');
      }

      if (exportData.activity?.audit_logs?.length > 0) {
        csvSections.push('## ACTIVITY LOG');
        const logKeys = Object.keys(exportData.activity.audit_logs[0]);
        csvSections.push(logKeys.join(','));
        exportData.activity.audit_logs.forEach((log: any) => {
          csvSections.push(
            logKeys
              .map((k) => {
                const v = log[k];
                if (v === null || v === undefined) return '';
                if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
                return `"${String(v).replace(/"/g, '""')}"`;
              })
              .join(',')
          );
        });
      }

      const csvContent = csvSections.join('\n');
      const filename = `edstop-data-export-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-GDPR-Export': 'true',
          'X-Export-ID': gdprMetadata.export_id,
        },
      });
    }

    const jsonContent = JSON.stringify(fullExport, null, 2);
    const filename = `edstop-data-export-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(jsonContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-GDPR-Export': 'true',
        'X-Export-ID': gdprMetadata.export_id,
      },
    });
  } catch (error: any) {
    console.error('Data export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export', details: error.message },
      { status: 500 }
    );
  }
}