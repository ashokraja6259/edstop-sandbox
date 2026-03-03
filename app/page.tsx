'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [phone, setPhone] = useState('')
  const [hostel, setHostel] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const currentUser = data.user
      setUser(currentUser)

      if (currentUser) {
        await createProfileIfNotExists(currentUser)
        await loadProfile(currentUser.id)
      }
    }

    init()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await createProfileIfNotExists(currentUser)
          await loadProfile(currentUser.id)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const createProfileIfNotExists = async (user: User) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!data) {
      await supabase.from('profiles').insert({
        id: user.id,
        name: user.user_metadata?.full_name,
        role: 'student'
      })
    }
  }

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data)
  }

  const updateProfile = async () => {
    await supabase
      .from('profiles')
      .update({ phone, hostel })
      .eq('id', user?.id)

    await loadProfile(user!.id)
  }

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-black text-white rounded-lg"
        >
          Login with Google
        </button>
      </div>
    )
  }

  if (profile && (!profile.phone || !profile.hostel)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md w-80">
          <h2 className="mb-4 text-lg font-semibold">
            Complete Your Profile
          </h2>
          <input
            type="text"
            placeholder="Phone Number"
            className="w-full mb-3 p-2 border rounded"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="text"
            placeholder="Hostel Name"
            className="w-full mb-3 p-2 border rounded"
            value={hostel}
            onChange={(e) => setHostel(e.target.value)}
          />
          <button
            onClick={updateProfile}
            className="w-full bg-black text-white py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="mb-4 text-lg">
          Welcome, {user.email}
        </p>
        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-red-500 text-white rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  )
}