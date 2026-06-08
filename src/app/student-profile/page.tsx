'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';

interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  rollNumber: string;
  hall: string;
  roomNumber: string;
  department: string;
  yearOfStudy: string;
  phoneVerified: boolean;
  campusEmailVerified: boolean;
}

interface LockedFields {
  rollNumber: boolean;
  department: boolean;
  yearOfStudy: boolean;
}

const HOSTELS = [
  'Hall 1', 'Hall 2', 'Hall 3', 'Hall 4', 'Hall 5',
  'Hall 6', 'Hall 7', 'Hall 8', 'Hall 9', 'Hall 10',
  'Hall 11', 'Hall 12', 'Azad Hall', 'Nehru Hall',
  'Patel Hall', 'RK Hall', 'VS Hall', 'LBS Hall',
  'MMM Hall', 'Gokhale Hall', 'Lala Lajpat Rai Hall',
  'Sarojini Naidu Hall', 'Indira Gandhi Hall',
];

const DEPARTMENTS = [
  'Aerospace Engineering',
  'Agricultural & Food Engineering',
  'Architecture & Regional Planning',
  'Biotechnology',
  'Chemical Engineering',
  'Chemistry',
  'Civil Engineering',
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Electronics & Electrical Communication Engineering',
  'Geology & Geophysics',
  'Humanities & Social Sciences',
  'Industrial & Systems Engineering',
  'Management Studies',
  'Mathematics',
  'Mechanical Engineering',
  'Metallurgical & Materials Engineering',
  'Mining Engineering',
  'Ocean Engineering & Naval Architecture',
  'Physics',
  'Rubber Technology',
];

const YEARS_OF_STUDY = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
  'PhD',
];

interface InputFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  helper?: string;
}

const InputField = ({
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
  helper,
}: InputFieldProps) => (
  <div>
    <label className="block text-xs font-medium text-white/60 mb-1.5">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'focus:border-purple-500/50'
      }`}
    />
    {helper && <p className="mt-1 text-xs text-white/40">{helper}</p>}
  </div>
);

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const [lockedFields, setLockedFields] = useState<LockedFields>({
    rollNumber: false,
    department: false,
    yearOfStudy: false,
  });

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: '',
    email: '',
    phone: '',
    rollNumber: '',
    hall: '',
    roomNumber: '',
    department: '',
    yearOfStudy: '',
    phoneVerified: false,
    campusEmailVerified: false,
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(
          'email, full_name, phone, roll_number, hall, room_number, department, year_of_study, phone_verified, campus_email_verified'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        toast.error('Profile load failed', profileError.message);
      }

      setPersonalInfo({
        fullName: profile?.full_name || user.user_metadata?.full_name || '',
        email: profile?.email || user.email || '',
        phone: profile?.phone || '',
        rollNumber: profile?.roll_number || '',
        hall: profile?.hall || '',
        roomNumber: profile?.room_number || '',
        department: profile?.department || '',
        yearOfStudy: profile?.year_of_study || '',
        phoneVerified: Boolean(profile?.phone_verified),
        campusEmailVerified: Boolean(profile?.campus_email_verified),
      });

      setLockedFields({
        rollNumber: Boolean(profile?.roll_number?.trim()),
        department: Boolean(profile?.department?.trim()),
        yearOfStudy: Boolean(profile?.year_of_study?.trim()),
      });

      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled) {
        setWalletBalance(
          wallet?.balance !== undefined && wallet?.balance !== null
            ? Number(wallet.balance)
            : 0
        );
        setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [toast, user]);

  const initials =
    personalInfo.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'ST';

  const isRollNumberLocked = lockedFields.rollNumber;
  const isDepartmentLocked = lockedFields.department;
  const isYearOfStudyLocked = lockedFields.yearOfStudy;

  const isProfileReady =
    personalInfo.rollNumber.trim().length > 0 &&
    personalInfo.department.trim().length > 0 &&
    personalInfo.yearOfStudy.trim().length > 0 &&
    personalInfo.hall.trim().length > 0 &&
    personalInfo.roomNumber.trim().length > 0;

  const handleSavePersonal = async () => {
    if (!user?.id) {
      toast.error('Not logged in', 'Please login again.');
      return;
    }

    if (!personalInfo.rollNumber.trim()) {
      toast.error('Roll number required', 'Please enter your roll number.');
      return;
    }

    if (!personalInfo.department.trim()) {
      toast.error('Department required', 'Please select your department.');
      return;
    }

    if (!personalInfo.yearOfStudy.trim()) {
      toast.error('Year of study required', 'Please select your year of study.');
      return;
    }

    if (!personalInfo.hall.trim()) {
      toast.error('Hall required', 'Please select your hall.');
      return;
    }

    if (!personalInfo.roomNumber.trim()) {
      toast.error('Room number required', 'Please enter your room number.');
      return;
    }

    setIsSaving(true);

    const updatePayload: {
      hall: string;
      room_number: string;
      updated_at: string;
      roll_number?: string;
      department?: string;
      year_of_study?: string;
    } = {
      hall: personalInfo.hall.trim(),
      room_number: personalInfo.roomNumber.trim(),
      updated_at: new Date().toISOString(),
    };

    if (!isRollNumberLocked) {
      updatePayload.roll_number = personalInfo.rollNumber.trim().toUpperCase();
    }

    if (!isDepartmentLocked) {
      updatePayload.department = personalInfo.department.trim();
    }

    if (!isYearOfStudyLocked) {
      updatePayload.year_of_study = personalInfo.yearOfStudy.trim();
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', user.id);

    if (error) {
      setIsSaving(false);
      toast.error('Profile update failed', error.message);
      return;
    }

    await refreshProfile();

    setLockedFields({
      rollNumber: true,
      department: true,
      yearOfStudy: true,
    });

    setIsSaving(false);

    toast.success(
      'Profile updated',
      'Your campus profile is complete. Redirecting to dashboard.'
    );

    router.replace('/student-dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 glass-strong border-b border-white/10 sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/student-dashboard"
            className="flex items-center justify-center w-9 h-9 rounded-xl glass hover:bg-white/10 transition-smooth"
          >
            <Icon name="ArrowLeftIcon" size={18} className="text-white/80" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-glow-purple">
              <Icon name="UserCircleIcon" size={20} variant="solid" className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">My Profile</h1>
              <p className="text-xs text-white/50">Complete your verified campus details</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {!isProfileReady && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-semibold text-yellow-200">
              Complete your profile to access the dashboard
            </p>
            <p className="mt-1 text-xs text-yellow-100/70">
              Roll number, department, year of study, hall, and room number are required for launch.
            </p>
          </div>
        )}

        <div className="glass-card rounded-2xl p-6 border border-white/10 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-glow-purple text-2xl font-bold text-white">
            {initials}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-white">{personalInfo.fullName || 'Student'}</h2>
            <p className="text-sm text-white/60 mt-0.5">
              {personalInfo.email || 'No email found'}
            </p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300">
                {personalInfo.department || 'Department not set'}
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300">
                {personalInfo.hall || 'Hall not set'}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300">
                {personalInfo.yearOfStudy || 'Year not set'}
              </span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              ₹{walletBalance.toFixed(0)}
            </div>
            <div className="text-xs text-white/50 mt-0.5">Wallet Balance</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              Personal Information
            </h3>
            <p className="text-xs text-white/50">
              Roll number, department, and year can be entered once if blank.
              Name, email, and phone are locked.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Full Name"
              value={personalInfo.fullName}
              disabled
              helper="Locked after signup."
            />

            <InputField
              label="Email"
              value={personalInfo.email}
              disabled
              helper={
                personalInfo.campusEmailVerified
                  ? 'Campus email verified.'
                  : 'Campus email verification pending.'
              }
            />

            <InputField
              label="Phone Number"
              value={personalInfo.phone}
              disabled
              placeholder="Not added"
              helper={
                personalInfo.phoneVerified
                  ? 'Phone verified.'
                  : 'Phone change requires verification and is disabled for launch.'
              }
            />

            <InputField
              label="Roll Number"
              value={personalInfo.rollNumber}
              disabled={isRollNumberLocked}
              onChange={(value) =>
                setPersonalInfo((previous) => ({
                  ...previous,
                  rollNumber: value.toUpperCase(),
                }))
              }
              placeholder="e.g. 21CS10045"
              helper={
                isRollNumberLocked
                  ? 'Locked after first save.'
                  : 'Required. Can be entered once.'
              }
            />
          </div>

          <div className="border-t border-white/10 pt-5">
            <h4 className="text-sm font-semibold text-white/80 mb-4">
              Campus Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Hall
                </label>
                <select
                  value={personalInfo.hall}
                  onChange={(event) =>
                    setPersonalInfo((previous) => ({
                      ...previous,
                      hall: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                >
                  <option value="" className="bg-gray-900">
                    Select hall
                  </option>
                  {HOSTELS.map((hall) => (
                    <option key={hall} value={hall} className="bg-gray-900">
                      {hall}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-white/40">
                  Students may update hall if allotment changes.
                </p>
              </div>

              <InputField
                label="Room Number"
                value={personalInfo.roomNumber}
                onChange={(value) =>
                  setPersonalInfo((previous) => ({
                    ...previous,
                    roomNumber: value,
                  }))
                }
                placeholder="e.g. 204"
                helper="Required. Students may update room number."
              />

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Department
                </label>
                <select
                  value={personalInfo.department}
                  disabled={isDepartmentLocked}
                  onChange={(event) =>
                    setPersonalInfo((previous) => ({
                      ...previous,
                      department: event.target.value,
                    }))
                  }
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 ${
                    isDepartmentLocked ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="" className="bg-gray-900">
                    Select department
                  </option>
                  {DEPARTMENTS.map((department) => (
                    <option
                      key={department}
                      value={department}
                      className="bg-gray-900"
                    >
                      {department}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-white/40">
                  {isDepartmentLocked
                    ? 'Locked after first save.'
                    : 'Required. Can be selected once.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Year of Study
                </label>
                <select
                  value={personalInfo.yearOfStudy}
                  disabled={isYearOfStudyLocked}
                  onChange={(event) =>
                    setPersonalInfo((previous) => ({
                      ...previous,
                      yearOfStudy: event.target.value,
                    }))
                  }
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 ${
                    isYearOfStudyLocked ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="" className="bg-gray-900">
                    Select year
                  </option>
                  {YEARS_OF_STUDY.map((year) => (
                    <option key={year} value={year} className="bg-gray-900">
                      {year}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-white/40">
                  {isYearOfStudyLocked
                    ? 'Locked after first save.'
                    : 'Required. Can be selected once.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-200 font-medium">
              Launch safety note
            </p>
            <p className="text-xs text-yellow-100/70 mt-1">
              Email, phone, full name, and previously saved roll/department/year
              values are read-only. Phone update will be enabled after OTP
              verification is implemented.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/student-dashboard"
              className="px-5 py-2.5 rounded-xl glass border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-smooth"
            >
              Cancel
            </Link>

            <button
              onClick={handleSavePersonal}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white shadow-glow-purple hover:opacity-90 transition-smooth disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="CheckIcon" size={16} />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}