-- Prevent RPC execution by anonymous users

revoke execute on function public.create_wallet_for_user() from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.is_admin_user() from anon;
revoke execute on function public.get_user_role(uuid) from anon;
revoke execute on function public.update_wallet_balance() from anon;
revoke execute on function public.log_table_mutation() from anon;
revoke execute on function public.validate_promo_code(text,numeric,text) from anon;

-- Also block direct execution by authenticated users where not needed

revoke execute on function public.create_wallet_for_user() from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.is_admin_user() from authenticated;
revoke execute on function public.get_user_role(uuid) from authenticated;
revoke execute on function public.update_wallet_balance() from authenticated;
revoke execute on function public.log_table_mutation() from authenticated;