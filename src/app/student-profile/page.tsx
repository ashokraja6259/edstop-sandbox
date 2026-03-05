// FILE: src/app/student-profile/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStudentProfileRealtime } from '@/hooks/useStudentProfileRealtime';

type TabId = 'personal' | 'security' | 'notifications' | 'payments' | 'data-export';

interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  rollNumber: string;
  hostel: string;
  roomNumber: string;
  department: string;
  year: string;
}

interface NotificationPrefs {
  orderPickup: boolean;
  orderDelivery: boolean;
  orderDelays: boolean;
  dailyDeals: boolean;
  cashbackAlerts: boolean;
  walletRecharge: boolean;
  lowBalanceAlert: boolean;
  promotionalEmails: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'wallet';
  label: string;
  detail: string;
  isDefault: boolean;
  icon: string;
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
  'Aerospace Engineering', 'Agricultural & Food Engineering',
  'Architecture & Regional Planning', 'Biotechnology',
  'Chemical Engineering', 'Chemistry', 'Civil Engineering',
  'Computer Science & Engineering', 'Electrical Engineering',
  'Electronics & Electrical Communication Engineering',
  'Geology & Geophysics', 'Humanities & Social Sciences',
  'Industrial & Systems Engineering', 'Management Studies',
  'Mathematics', 'Mechanical Engineering', 'Metallurgical & Materials Engineering',
  'Mining Engineering', 'Ocean Engineering & Naval Architecture',
  'Physics', 'Rubber Technology',
];

const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm1', type: 'wallet', label: 'EdCoins Wallet', detail: '₹1,250.50 available', isDefault: true, icon: '💰' },
  { id: 'pm2', type: 'upi', label: 'UPI', detail: 'student@kgp', isDefault: false, icon: '📱' },
  { id: 'pm3', type: 'card', label: 'HDFC Debit Card', detail: '**** **** **** 4521', isDefault: false, icon: '💳' },
];

export default function StudentProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('personal');
  const [isSaving, setIsSaving] = useState(false);

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: user?.user_metadata?.full_name || 'Siddharth Kumar',
    email: user?.email || 'siddharth.kumar@kgpian.iitkgp.ac.in',
    phone: '+91 98765 43210',
    rollNumber: '21CS10045',
    hostel: 'Hall 3',
    roomNumber: '204',
    department: 'Computer Science & Engineering',
    year: '3rd Year',
  });
  const [personalErrors, setPersonalErrors] = useState<Partial<PersonalInfo>>({});

  // Security State
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState<'app' | 'sms'>('app');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const sessions = [
    { id: 's1', device: 'Chrome on Windows', location: 'Kharagpur, WB', time: 'Active now', current: true },
    { id: 's2', device: 'Safari on iPhone', location: 'Kharagpur, WB', time: '2 hours ago', current: false },
    { id: 's3', device: 'Firefox on MacOS', location: 'Kolkata, WB', time: '3 days ago', current: false },
  ];

  // Notification State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    orderPickup: true,
    orderDelivery: true,
    orderDelays: true,
    dailyDeals: true,
    cashbackAlerts: true,
    walletRecharge: true,
    lowBalanceAlert: true,
    promotionalEmails: false,
  });

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [showAddUPI, setShowAddUPI] = useState(false);
  const [newUPI, setNewUPI] = useState('');

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'personal', label: 'Personal Info', icon: 'UserCircleIcon' },
    { id: 'security', label: 'Account Security', icon: 'ShieldCheckIcon' },
    { id: 'notifications', label: 'Notifications', icon: 'BellIcon' },
    { id: 'payments', label: 'Payment Methods', icon: 'CreditCardIcon' },
    { id: 'data-export', label: 'Data Export', icon: 'ArrowDownTrayIcon' },
  ];

  // Validation
  const validatePersonal = () => {
    const errors: Partial<PersonalInfo> = {};
    if (!personalInfo.fullName.trim()) errors.fullName = 'Full name is required';
    if (!personalInfo.email.match(/@(kgpian\.iitkgp\.ac\.in|iitkgp\.ac\.in)$/)) {
      errors.email = 'Must be a valid IIT Kharagpur email';
    }
    if (personalInfo.phone && !personalInfo.phone.match(/^\+91\s?[6-9]\d{9}$/)) {
      errors.phone = 'Enter a valid Indian phone number';
    }
    setPersonalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors: Record<string, string> = {};
    if (!passwords.current) errors.current = 'Current password is required';
    if (passwords.newPass.length < 8) errors.newPass = 'Password must be at least 8 characters';
    if (passwords.newPass !== passwords.confirm) errors.confirm = 'Passwords do not match';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePersonal = async () => {
    if (!validatePersonal()) return;
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
    toast.success('Profile updated', 'Your personal information has been saved successfully');
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
    setPasswords({ current: '', newPass: '', confirm: '' });
    toast.success('Password changed', 'Your password has been updated successfully');
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    toast.success('Preferences saved', 'Notification preferences updated successfully');
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: pm.id === id })));
    toast.success('Default updated', 'Default payment method has been changed');
  };

  const handleRemovePayment = (id: string) => {
    const method = paymentMethods.find(pm => pm.id === id);
    if (method?.isDefault) {
      toast.error('Cannot remove', 'Set another method as default before removing this one');
      return;
    }
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
    toast.success('Removed', 'Payment method removed successfully');
  };

  const handleAddUPI = () => {
    if (!newUPI.match(/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/)) {
      toast.error('Invalid UPI', 'Please enter a valid UPI ID (e.g. name@upi)');
      return;
    }
    const newMethod: PaymentMethod = {
      id: `pm${Date.now()}`,
      type: 'upi',
      label: 'UPI',
      detail: newUPI,
      isDefault: false,
      icon: '📱',
    };
    setPaymentMethods(prev => [...prev, newMethod]);
    setNewUPI('');
    setShowAddUPI(false);
    toast.success('UPI added', `${newUPI} has been added as a payment method`);
  };

  const handleTerminateSession = (id: string) => {
    liveTerminateSession(id);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-purple-500' : 'bg-white/20'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const InputField = ({
    label, value, onChange, error, type = 'text', placeholder, disabled = false,
  }: {
    label: string; value: string; onChange?: (v: string) => void;
    error?: string; type?: string; placeholder?: string; disabled?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border text-white text-sm placeholder-white/30
          focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all
          ${
            disabled ? 'opacity-50 cursor-not-allowed' : error ?'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-purple-500/50'
          }`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );

  const PasswordField = ({
    label, fieldKey, value, onChange, error,
  }: {
    label: string; fieldKey: 'current' | 'newPass' | 'confirm';
    value: string; onChange: (v: string) => void; error?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={showPasswords[fieldKey] ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full px-4 py-2.5 pr-10 rounded-xl bg-white/5 border text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all
            ${error ? 'border-red-500/60' : 'border-white/10 focus:border-purple-500/50'}`}
        />
        <button
          type="button"
          onClick={() => setShowPasswords(p => ({ ...p, [fieldKey]: !p[fieldKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
        >
          <Icon name={showPasswords[fieldKey] ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );

  // ── Supabase real-time: 2FA, sessions, password change tracking ──────────
  const {
    twoFAEnabled: liveTwoFAEnabled,
    activeSessions,
    passwordLastChanged,
    passwordChangeCount,
    isLive,
    isLoading: profileLoading,
    terminateSession: liveTerminateSession,
    toggle2FA: liveToggle2FA,
  } = useStudentProfileRealtime(user?.id);

  // Sync live 2FA state into local state on first load
  const [twoFASynced, setTwoFASynced] = useState(false);
  if (!twoFASynced && !profileLoading) {
    setTwoFAEnabled(liveTwoFAEnabled);
    setTwoFASynced(true);
  }

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      {/* Header */}
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
              <p className="text-xs text-white/50">Manage your account settings</p>
            </div>
          </div>
          {isLive && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">LIVE</span>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Header Card — skeleton while loading */}
        {profileLoading ? (
          <div className="glass-card rounded-2xl p-6 border border-white/10 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="animate-pulse w-20 h-20 bg-white/10 rounded-2xl flex-shrink-0"></div>
            <div className="flex-1 space-y-3 w-full">
              <div className="animate-pulse h-5 bg-white/10 rounded w-40"></div>
              <div className="animate-pulse h-3 bg-white/5 rounded w-56"></div>
              <div className="flex gap-2">
                <div className="animate-pulse h-6 bg-white/10 rounded-full w-20"></div>
                <div className="animate-pulse h-6 bg-white/10 rounded-full w-16"></div>
                <div className="animate-pulse h-6 bg-white/10 rounded-full w-18"></div>
              </div>
            </div>
            <div className="text-center space-y-1">
              <div className="animate-pulse h-7 bg-white/10 rounded w-20"></div>
              <div className="animate-pulse h-3 bg-white/5 rounded w-24"></div>
            </div>
          </div>
        ) : (
        <div className="glass-card rounded-2xl p-6 border border-white/10 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative">
            <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-glow-purple text-2xl font-bold text-white">
              {personalInfo.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center hover:bg-purple-400 transition-colors shadow-lg">
              <Icon name="PencilIcon" size={12} className="text-white" />
            </button>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-white">{personalInfo.fullName}</h2>
            <p className="text-sm text-white/60 mt-0.5">{personalInfo.email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300">
                {personalInfo.department.split(' ')[0]}
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300">
                {personalInfo.hostel}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300">
                {personalInfo.year}
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">₹1,250</div>
            <div className="text-xs text-white/50 mt-0.5">EdCoins Balance</div>
          </div>
        </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-2xl border border-white/10 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? 'gradient-primary text-white shadow-glow-purple'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon name={tab.icon as any} size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── PERSONAL INFO TAB ── */}
        {activeTab === 'personal' && (
          <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Personal Information</h3>
              <p className="text-xs text-white/50">Update your profile details and campus information</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Full Name"
                value={personalInfo.fullName}
                onChange={v => setPersonalInfo(p => ({ ...p, fullName: v }))}
                error={personalErrors.fullName}
                placeholder="Your full name"
              />
              <InputField
                label="IIT KGP Email"
                value={personalInfo.email}
                onChange={v => setPersonalInfo(p => ({ ...p, email: v }))}
                error={personalErrors.email}
                placeholder="rollno@kgpian.iitkgp.ac.in"
              />
              <InputField
                label="Phone Number"
                value={personalInfo.phone}
                onChange={v => setPersonalInfo(p => ({ ...p, phone: v }))}
                error={personalErrors.phone}
                placeholder="+91 XXXXX XXXXX"
              />
              <InputField
                label="Roll Number"
                value={personalInfo.rollNumber}
                disabled
              />
            </div>

            <div className="border-t border-white/10 pt-5">
              <h4 className="text-sm font-semibold text-white/80 mb-4">Campus Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Hostel</label>
                  <select
                    value={personalInfo.hostel}
                    onChange={e => setPersonalInfo(p => ({ ...p, hostel: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    {HOSTELS.map(h => <option key={h} value={h} className="bg-gray-900">{h}</option>)}
                  </select>
                </div>
                <InputField
                  label="Room Number"
                  value={personalInfo.roomNumber}
                  onChange={v => setPersonalInfo(p => ({ ...p, roomNumber: v }))}
                  placeholder="e.g. 204"
                />
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Department</label>
                  <select
                    value={personalInfo.department}
                    onChange={e => setPersonalInfo(p => ({ ...p, department: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Year of Study</label>
                  <select
                    value={personalInfo.year}
                    onChange={e => setPersonalInfo(p => ({ ...p, year: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'PhD'].map(y => (
                      <option key={y} value={y} className="bg-gray-900">{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPersonalErrors({})}
                className="px-5 py-2.5 rounded-xl glass border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePersonal}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white shadow-glow-purple hover:opacity-90 transition-smooth disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                ) : (
                  <><Icon name="CheckIcon" size={16} />Save Changes</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── ACCOUNT SECURITY TAB ── */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            {/* Change Password */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Icon name="LockClosedIcon" size={20} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Change Password</h3>
                  <p className="text-xs text-white/50">Use a strong password with 8+ characters</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <PasswordField
                    label="Current Password"
                    fieldKey="current"
                    value={passwords.current}
                    onChange={v => setPasswords(p => ({ ...p, current: v }))}
                    error={passwordErrors.current}
                  />
                </div>
                <PasswordField
                  label="New Password"
                  fieldKey="newPass"
                  value={passwords.newPass}
                  onChange={v => setPasswords(p => ({ ...p, newPass: v }))}
                  error={passwordErrors.newPass}
                />
                <PasswordField
                  label="Confirm New Password"
                  fieldKey="confirm"
                  value={passwords.confirm}
                  onChange={v => setPasswords(p => ({ ...p, confirm: v }))}
                  error={passwordErrors.confirm}
                />
              </div>
              {passwords.newPass && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        passwords.newPass.length < 6 ? 'w-1/4 bg-red-500' :
                        passwords.newPass.length < 8 ? 'w-1/2 bg-yellow-500' :
                        passwords.newPass.length < 12 ? 'w-3/4 bg-blue-500' : 'w-full bg-emerald-500'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-white/50">
                    {passwords.newPass.length < 6 ? 'Weak' : passwords.newPass.length < 8 ? 'Fair' : passwords.newPass.length < 12 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white shadow-glow-purple hover:opacity-90 transition-smooth disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating...</>
                  ) : (
                    <><Icon name="LockClosedIcon" size={16} />Update Password</>
                  )}
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Icon name="ShieldCheckIcon" size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Two-Factor Authentication</h3>
                    <p className="text-xs text-white/50">Add an extra layer of security to your account</p>
                  </div>
                </div>
                <Toggle checked={twoFAEnabled} onChange={() => {
                  const next = !twoFAEnabled;
                  setTwoFAEnabled(next);
                  liveToggle2FA(next);
                }} />
              </div>

              {twoFAEnabled && (
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <p className="text-sm text-white/70">Choose your 2FA method:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['app', 'sms'] as const).map(method => (
                      <button
                        key={method}
                        onClick={() => setTwoFAMethod(method)}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                          twoFAMethod === method
                            ? 'border-purple-500/60 bg-purple-500/10' :'border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          twoFAMethod === method ? 'bg-purple-500/30' : 'bg-white/10'
                        }`}>
                          <Icon name={method === 'app' ? 'DevicePhoneMobileIcon' : 'ChatBubbleLeftIcon'} size={18} className={twoFAMethod === method ? 'text-purple-300' : 'text-white/60'} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">{method === 'app' ? 'Authenticator App' : 'SMS Verification'}</p>
                          <p className="text-xs text-white/50">{method === 'app' ? 'Google/Microsoft Authenticator' : 'OTP to your phone'}</p>
                        </div>
                        {twoFAMethod === method && <Icon name="CheckCircleIcon" size={18} className="text-purple-400 ml-auto" />}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => toast.success('2FA Setup', `${twoFAMethod === 'app' ? 'Authenticator app' : 'SMS'} 2FA has been enabled`)}
                    className="w-full py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white shadow-glow-purple hover:opacity-90 transition-smooth"
                  >
                    Set Up {twoFAMethod === 'app' ? 'Authenticator App' : 'SMS Verification'}
                  </button>
                </div>
              )}
            </div>

            {/* Active Sessions */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Icon name="ComputerDesktopIcon" size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Active Sessions</h3>
                    <p className="text-xs text-white/50">Manage devices logged into your account</p>
                  </div>
                </div>
                {isLive && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              {profileLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="animate-pulse w-2.5 h-2.5 rounded-full bg-white/20"></div>
                        <div className="space-y-1.5">
                          <div className="animate-pulse h-3.5 bg-white/10 rounded w-36"></div>
                          <div className="animate-pulse h-2.5 bg-white/5 rounded w-28"></div>
                        </div>
                      </div>
                      <div className="animate-pulse h-7 bg-white/10 rounded-lg w-20"></div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="space-y-3">
                {activeSessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        session.current ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-white">{session.device}</p>
                        <p className="text-xs text-white/50">{session.location} · {session.time}</p>
                      </div>
                    </div>
                    {session.current ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">Current</span>
                    ) : (
                      <button
                        onClick={() => handleTerminateSession(session.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                      >
                        Terminate
                      </button>
                    )}
                  </div>
                ))}
              </div>
              )}
              {passwordLastChanged && (
                <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                  <Icon name="ClockIcon" size={14} className="text-white/40 shrink-0" />
                  <p className="text-xs text-white/50">
                    Security last updated: {new Date(passwordLastChanged).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {passwordChangeCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                        {passwordChangeCount} update{passwordChangeCount > 1 ? 's' : ''} this session
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === 'notifications' && (
          <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Notification Preferences</h3>
              <p className="text-xs text-white/50">Control what notifications you receive and how</p>
            </div>

            {/* Order Updates */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="ShoppingBagIcon" size={16} className="text-purple-400" />
                <h4 className="text-sm font-semibold text-white">Order Updates</h4>
              </div>
              <div className="space-y-3">
                {([
                  { key: 'orderPickup', label: 'Order Pickup', desc: 'When your order is picked up by the rider' },
                  { key: 'orderDelivery', label: 'Order Delivered', desc: 'When your order is successfully delivered' },
                  { key: 'orderDelays', label: 'Delivery Delays', desc: 'Alerts when your order is running late' },
                ] as { key: keyof NotificationPrefs; label: string; desc: string }[]).map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/50">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifPrefs[item.key]}
                      onChange={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Promotional Offers */}
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="TagIcon" size={16} className="text-pink-400" />
                <h4 className="text-sm font-semibold text-white">Promotional Offers</h4>
              </div>
              <div className="space-y-3">
                {([
                  { key: 'dailyDeals', label: 'Daily Deals', desc: 'Flash sales and limited-time offers' },
                  { key: 'cashbackAlerts', label: 'Cashback Alerts', desc: 'Notifications about cashback earned and expiry' },
                  { key: 'promotionalEmails', label: 'Promotional Emails', desc: 'Weekly newsletters and campus deals' },
                ] as { key: keyof NotificationPrefs; label: string; desc: string }[]).map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/50">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifPrefs[item.key]}
                      onChange={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Wallet Notifications */}
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="WalletIcon" size={16} className="text-emerald-400" />
                <h4 className="text-sm font-semibold text-white">Wallet Notifications</h4>
              </div>
              <div className="space-y-3">
                {([
                  { key: 'walletRecharge', label: 'Recharge Confirmations', desc: 'When EdCoins are added to your wallet' },
                  { key: 'lowBalanceAlert', label: 'Low Balance Alert', desc: 'When your EdCoins balance falls below ₹100' },
                ] as { key: keyof NotificationPrefs; label: string; desc: string }[]).map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/50">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifPrefs[item.key]}
                      onChange={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveNotifications}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white shadow-glow-purple hover:opacity-90 transition-smooth disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                ) : (
                  <><Icon name="CheckIcon" size={16} />Save Preferences</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── PAYMENT METHODS TAB ── */}
        {activeTab === 'payments' && (
          <div className="space-y-5">
            <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Saved Payment Methods</h3>
                  <p className="text-xs text-white/50 mt-0.5">Manage your cards, UPI IDs, and wallet</p>
                </div>
                <button
                  onClick={() => setShowAddUPI(p => !p)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-sm font-semibold text-white shadow-glow-purple hover:opacity-90 transition-smooth"
                >
                  <Icon name="PlusIcon" size={16} />
                  Add UPI
                </button>
              </div>

              {showAddUPI && (
                <div className="p-4 rounded-xl bg-white/5 border border-purple-500/30 space-y-3">
                  <p className="text-sm font-medium text-white">Add UPI ID</p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newUPI}
                      onChange={e => setNewUPI(e.target.value)}
                      placeholder="yourname@upi"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                    <button
                      onClick={handleAddUPI}
                      className="px-4 py-2.5 rounded-xl gradient-primary text-sm font-semibold text-white hover:opacity-90 transition-smooth"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setShowAddUPI(false); setNewUPI(''); }}
                      className="px-4 py-2.5 rounded-xl glass border border-white/10 text-sm text-white/70 hover:bg-white/10 transition-smooth"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {paymentMethods.map(method => (
                  <div
                    key={method.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      method.isDefault
                        ? 'border-purple-500/40 bg-purple-500/10' :'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                        {method.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{method.label}</p>
                          {method.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-xs font-medium">Default</span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">{method.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                      {method.type !== 'wallet' && (
                        <button
                          onClick={() => handleRemovePayment(method.id)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Icon name="TrashIcon" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Default Preferences */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Icon name="StarIcon" size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Default Preferences</h3>
                  <p className="text-xs text-white/50">Set preferred payment for different transaction types</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Food Orders', value: 'EdCoins Wallet', icon: '🍔' },
                  { label: 'Dark Store Shopping', value: 'EdCoins Wallet', icon: '🛒' },
                  { label: 'Wallet Recharge', value: 'UPI (student@kgp)', icon: '💰' },
                ].map(pref => (
                  <div key={pref.label} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{pref.icon}</span>
                      <p className="text-sm font-medium text-white">{pref.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60">{pref.value}</span>
                      <Icon name="ChevronRightIcon" size={14} className="text-white/30" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <Icon name="ShieldCheckIcon" size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">Secure & Encrypted</p>
                <p className="text-xs text-white/60 mt-0.5">All payment information is encrypted with AES-256. We never store full card numbers or CVV details.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── DATA EXPORT TAB ── */}
        {activeTab === 'data-export' && (
          <DataExportTab userId={user?.id} userEmail={user?.email} />
        )}

        {/* ── DANGER ZONE ── */}
        <div className="mt-8 p-5 rounded-2xl bg-red-500/8 border border-red-500/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="TrashIcon" size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-red-300 text-sm mb-1">Delete Account</h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Permanently delete your account and all associated data. A 30-day grace period applies.
                </p>
              </div>
            </div>
            <Link
              href="/account-deletion"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-smooth press-scale"
            >
              <Icon name="TrashIcon" size={14} />
              Delete
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── DATA EXPORT TAB COMPONENT ────────────────────────────────────────────────
interface DataExportTabProps {
  userId?: string;
  userEmail?: string;
}

function DataExportTab({ userId, userEmail }: DataExportTabProps) {
  const toast = useToast();
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['profile', 'orders', 'activity']);
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const dataTypes = [
    {
      id: 'profile',
      label: 'Profile & Account',
      description: 'Personal info, email, campus details, account settings',
      icon: 'UserCircleIcon',
      color: 'purple',
    },
    {
      id: 'orders',
      label: 'Orders History',
      description: 'All food and dark store orders with items and payment details',
      icon: 'ShoppingBagIcon',
      color: 'indigo',
    },
    {
      id: 'activity',
      label: 'Activity & Transactions',
      description: 'Wallet transactions, audit logs, and platform activity',
      icon: 'ClockIcon',
      color: 'emerald',
    },
  ];

  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      toast.error('No data selected', 'Please select at least one data category to export');
      return;
    }
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format: selectedFormat,
        types: selectedTypes.join(','),
      });
      const response = await fetch(`/api/data-export?${params.toString()}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `edstop-data-export-${dateStr}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      setLastExport(now);
      toast.success('Export ready', `Your data has been downloaded as ${selectedFormat.toUpperCase()}`);
    } catch (err: any) {
      toast.error('Export failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    indigo: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
    emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  };
  const iconBgMap: Record<string, string> = {
    purple: 'bg-purple-500/20 text-purple-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="space-y-5">
      {/* GDPR Notice */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Icon name="ShieldCheckIcon" size={24} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-1">Your Data, Your Rights</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Under <span className="text-blue-300 font-medium">GDPR Article 20</span>, you have the right to receive your personal data in a portable format.
              This export includes all data EdStop holds about you, with full compliance metadata.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['Right to Portability', 'Right to Access', 'AES-256 Encrypted'].map(badge => (
                <span key={badge} className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-xs text-blue-300">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data Category Selection */}
      <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Select Data to Export</h3>
          <p className="text-xs text-white/50">Choose which categories of your data to include in the export</p>
        </div>
        <div className="space-y-3">
          {dataTypes.map(dt => {
            const isSelected = selectedTypes.includes(dt.id);
            return (
              <button
                key={dt.id}
                onClick={() => toggleType(dt.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-white/8 border-purple-500/40 ring-1 ring-purple-500/20' :'bg-white/3 border-white/10 hover:bg-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgMap[dt.color]}`}>
                  <Icon name={dt.icon as any} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{dt.label}</p>
                  <p className="text-xs text-white/50 mt-0.5">{dt.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? 'bg-purple-500 border-purple-500' : 'border-white/30'
                }`}>
                  {isSelected && <Icon name="CheckIcon" size={12} className="text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Format Selection */}
      <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Export Format</h3>
          <p className="text-xs text-white/50">Choose the file format for your data export</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              id: 'json' as const,
              label: 'JSON',
              description: 'Structured data with full GDPR metadata. Best for developers.',
              icon: '{ }',
            },
            {
              id: 'csv' as const,
              label: 'CSV',
              description: 'Spreadsheet-compatible format. Best for viewing in Excel.',
              icon: '⊞',
            },
          ] as const).map(fmt => (
            <button
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedFormat === fmt.id
                  ? 'bg-white/8 border-purple-500/40 ring-1 ring-purple-500/20' :'bg-white/3 border-white/10 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-mono font-bold text-white/80">{fmt.icon}</span>
                {selectedFormat === fmt.id && (
                  <span className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                    <Icon name="CheckIcon" size={10} className="text-white" />
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white">{fmt.label}</p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">{fmt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* GDPR Compliance Info */}
      <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-3">
        <h3 className="text-sm font-bold text-white/80">Export Compliance Details</h3>
        <div className="space-y-2">
          {[
            { label: 'Data Controller', value: 'EdStop Platform, IIT Kharagpur' },
            { label: 'Legal Basis', value: 'GDPR Article 20 — Right to Data Portability' },
            { label: 'Retention Policy', value: '3 years after account closure' },
            { label: 'Contact', value: 'privacy@edstop.iitkgp.ac.in' },
          ].map(item => (
            <div key={item.label} className="flex items-start justify-between gap-4 py-2 border-b border-white/5 last:border-0">
              <span className="text-xs text-white/50 flex-shrink-0">{item.label}</span>
              <span className="text-xs text-white/80 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Export Action */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">
              Ready to export{' '}
              <span className="text-purple-400">{selectedTypes.length} categor{selectedTypes.length === 1 ? 'y' : 'ies'}</span>
              {' '}as <span className="text-purple-400">{selectedFormat.toUpperCase()}</span>
            </p>
            {lastExport ? (
              <p className="text-xs text-white/40 mt-0.5">Last exported: {lastExport}</p>
            ) : (
              <p className="text-xs text-white/40 mt-0.5">Export includes GDPR compliance metadata</p>
            )}
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedTypes.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-sm font-semibold text-white shadow-glow-purple hover:opacity-90 transition-smooth disabled:opacity-60 whitespace-nowrap"
          >
            {isExporting ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
            ) : (
              <><Icon name="ArrowDownTrayIcon" size={16} />Download Export</>
            )}
          </button>
        </div>
      </div>

      {/* Data Deletion Notice */}
      <div className="p-4 rounded-xl bg-red-500/8 border border-red-500/20 flex items-start gap-3">
        <Icon name="ExclamationTriangleIcon" size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-300">Right to Erasure (GDPR Article 17)</p>
          <p className="text-xs text-white/50 mt-0.5">
            To request deletion of all your data, contact{' '}
            <span className="text-red-300">privacy@edstop.iitkgp.ac.in</span>.
            Account deletion requests are processed within 30 days.
          </p>
        </div>
      </div>
    </div>
  );
}