import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AppRole = 'student' | 'admin' | 'rider' | 'vendor';

export async function requireRole(requiredRole: AppRole) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const userRole = (profile?.role || 'student') as AppRole;

  if (userRole !== requiredRole) {
    redirect('/unauthorized');
  }

  return { user, role: userRole };
}
