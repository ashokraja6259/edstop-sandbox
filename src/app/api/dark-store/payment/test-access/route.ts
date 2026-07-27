import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isApprovedRazorpayTestUser } from '@/lib/payments/test-checkout';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ enabled: false }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    enabled: isApprovedRazorpayTestUser(user.id, profile?.role),
    mode: 'test',
  });
}
