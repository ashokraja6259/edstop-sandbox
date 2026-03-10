'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

type UserProfile = {
  id: string;
  full_name: string | null;
  role: 'student' | 'rider' | 'admin' | null;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    setProfile((data as UserProfile | null) ?? null);
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser.id);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await loadUserProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <button
          onClick={handleLogin}
          className="rounded-lg bg-black px-6 py-3 text-white"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="mb-2 text-lg font-medium">
          Welcome, {profile?.full_name || user.email}
        </p>

        {profile?.role && (
          <p className="mb-4 text-sm text-gray-600">Role: {profile.role}</p>
        )}

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-500 px-6 py-3 text-white"
        >
          Logout
        </button>
      </div>
    </div>
  );
}