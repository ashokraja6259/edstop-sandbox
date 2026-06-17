-- Revoke broad PUBLIC execute access on SECURITY DEFINER functions

revoke execute on function public.create_wallet_for_user() from public;
revoke execute on function public.get_user_role(uuid) from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.is_admin_user() from public;
revoke execute on function public.log_table_mutation() from public;
revoke execute on function public.update_wallet_balance() from public;
revoke execute on function public.validate_promo_code(text, numeric, text) from public;

-- Allow promo validation only for signed-in users if the app calls it client-side.
grant execute on function public.validate_promo_code(text, numeric, text) to authenticated;