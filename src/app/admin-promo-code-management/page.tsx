// FILE: src/app/admin-promo-code-management/page.tsx

'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import Icon from '@/components/ui/AppIcon';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, Legend } from 'recharts';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  applicable_order_types: string[];
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  code: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: string;
  min_order_amount: string;
  max_discount_amount: string;
  applicable_order_types: string[];
  usage_limit: string;
  expires_at: string;
}

const defaultForm: FormData = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '0',
  max_discount_amount: '',
  applicable_order_types: ['food', 'store'],
  usage_limit: '',
  expires_at: '',
};

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ED';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface AlertThresholds {
  id: string;
  redemption_cap_pct: number;
  expiry_days_before: number;
  roi_target_pct: number;
  alert_emails: string[];
}

interface AlertLog {
  id: string;
  promo_code: string;
  alert_type: string;
  details: Record<string, any>;
  sent_at: string;
}

export default function AdminPromoCodeManagement() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <AdminPromoCodeManagementInner />
    </Suspense>
  );
}

function AdminPromoCodeManagementInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'expired'>('all');
  const [filterType, setFilterType] = useState<'all' | 'percentage' | 'flat'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'used_count' | 'expires_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [bulkAction, setBulkAction] = useState('');
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'codes' | 'roi' | 'alerts'>('codes');

  // Prefill from template (via URL params)
  useEffect(() => {
    if (searchParams.get('prefill') === '1') {
      const services = searchParams.get('applicable_order_types');
      const durationDays = searchParams.get('duration_days');
      const expiresAt = durationDays
        ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + Number(durationDays));
            return d.toISOString().slice(0, 10);
          })()
        : '';
      setFormData({
        code: '',
        description: searchParams.get('description') || '',
        discount_type: (searchParams.get('discount_type') as 'percentage' | 'flat') || 'percentage',
        discount_value: searchParams.get('discount_value') || '',
        min_order_amount: searchParams.get('min_order_amount') || '0',
        max_discount_amount: searchParams.get('max_discount_amount') || '',
        applicable_order_types: services ? services.split(',') : ['food', 'store'],
        usage_limit: searchParams.get('usage_limit') || '',
        expires_at: expiresAt,
      });
      setEditingId(null);
      setFormError('');
      setShowForm(true);
      setActiveTab('codes');
    }
  }, [searchParams]);

  // Alert threshold state
  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds | null>(null);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertChecking, setAlertChecking] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [thresholdForm, setThresholdForm] = useState({
    redemption_cap_pct: 80,
    expiry_days_before: 3,
    roi_target_pct: 200,
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order(sortBy, { ascending: sortDir === 'asc' });
      if (error) throw error;
      setPromoCodes(data || []);
    } catch (err) {
      showToast('Failed to load promo codes', 'error');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortDir]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  // --- ROI & Analytics Computations ---
  const roiMetrics = useMemo(() => {
    const totalRedemptions = promoCodes.reduce((s, p) => s + p.used_count, 0);
    const activeCodes = promoCodes.filter(p => p.is_active && (!p.expires_at || new Date(p.expires_at) > new Date()));

    // Estimate avg discount given per redemption (use discount_value as proxy)
    const totalDiscountGiven = promoCodes.reduce((s, p) => {
      const avgDiscount = p.discount_type === 'flat' ? p.discount_value : (p.discount_value / 100) * (p.min_order_amount || 100);
      return s + avgDiscount * p.used_count;
    }, 0);

    // Estimate revenue influenced: assume each redemption drove an order worth min_order_amount + avg basket
    const totalRevenueInfluenced = promoCodes.reduce((s, p) => {
      const avgOrderValue = (p.min_order_amount || 100) * 1.5;
      return s + avgOrderValue * p.used_count;
    }, 0);

    // ROI = (Revenue Influenced - Discount Given) / Discount Given * 100
    const roi = totalDiscountGiven > 0
      ? ((totalRevenueInfluenced - totalDiscountGiven) / totalDiscountGiven) * 100
      : 0;

    // User Acquisition Cost = Total Discount Given / Unique Users (approx = redemptions)
    const uac = totalRedemptions > 0 ? totalDiscountGiven / totalRedemptions : 0;

    // Campaign Effectiveness Score (0-100): weighted blend of redemption rate, ROI, active ratio
    const avgRedemptionRate = promoCodes.reduce((s, p) => {
      if (!p.usage_limit) return s + (p.used_count > 0 ? 60 : 20);
      return s + Math.min((p.used_count / p.usage_limit) * 100, 100);
    }, 0) / (promoCodes.length || 1);
    const roiScore = Math.min(roi / 5, 40); // max 40 pts from ROI
    const activeRatio = promoCodes.length > 0 ? (activeCodes.length / promoCodes.length) * 20 : 0;
    const effectivenessScore = Math.min(Math.round(avgRedemptionRate * 0.4 + roiScore + activeRatio), 100);

    return {
      totalRedemptions,
      totalDiscountGiven: Math.round(totalDiscountGiven),
      totalRevenueInfluenced: Math.round(totalRevenueInfluenced),
      roi: Math.round(roi),
      uac: Math.round(uac),
      effectivenessScore,
      activeCodes: activeCodes.length,
    };
  }, [promoCodes]);

  // Per-code effectiveness data for bar chart
  const codeEffectivenessData = useMemo(() => {
    return promoCodes
      .filter(p => p.used_count > 0)
      .map(p => {
        const avgDiscount = p.discount_type === 'flat' ? p.discount_value : (p.discount_value / 100) * (p.min_order_amount || 100);
        const discountGiven = avgDiscount * p.used_count;
        const revenueInfluenced = (p.min_order_amount || 100) * 1.5 * p.used_count;
        const codeRoi = discountGiven > 0 ? Math.round(((revenueInfluenced - discountGiven) / discountGiven) * 100) : 0;
        const capUtil = p.usage_limit ? Math.round((p.used_count / p.usage_limit) * 100) : 50;
        const score = Math.min(Math.round((capUtil * 0.4) + (Math.min(codeRoi / 5, 40)) + 20), 100);
        return {
          code: p.code,
          redemptions: p.used_count,
          discountGiven: Math.round(discountGiven),
          revenueInfluenced: Math.round(revenueInfluenced),
          roi: codeRoi,
          score,
          uac: p.used_count > 0 ? Math.round(discountGiven / p.used_count) : 0,
        };
      })
      .sort((a, b) => b.redemptions - a.redemptions)
      .slice(0, 8);
  }, [promoCodes]);

  // Revenue impact over time (simulated from created_at spread)
  const revenueImpactData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; discount: number; roi: number }> = {};
    promoCodes.forEach(p => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: label, revenue: 0, discount: 0, roi: 0 };
      const avgDiscount = p.discount_type === 'flat' ? p.discount_value : (p.discount_value / 100) * (p.min_order_amount || 100);
      months[key].discount += Math.round(avgDiscount * p.used_count);
      months[key].revenue += Math.round((p.min_order_amount || 100) * 1.5 * p.used_count);
    });
    return Object.values(months).map(m => ({
      ...m,
      roi: m.discount > 0 ? Math.round(((m.revenue - m.discount) / m.discount) * 100) : 0,
    }));
  }, [promoCodes]);

  // Radar data for campaign effectiveness dimensions
  const radarData = useMemo(() => [
    { dimension: 'Redemption Rate', value: Math.min(roiMetrics.totalRedemptions * 5, 100) },
    { dimension: 'ROI', value: Math.min(Math.max(roiMetrics.roi / 3, 0), 100) },
    { dimension: 'Cost Efficiency', value: roiMetrics.uac > 0 ? Math.max(100 - roiMetrics.uac, 10) : 50 },
    { dimension: 'Active Coverage', value: promoCodes.length > 0 ? Math.round((roiMetrics.activeCodes / promoCodes.length) * 100) : 0 },
    { dimension: 'Revenue Impact', value: Math.min(roiMetrics.totalRevenueInfluenced / 1000, 100) },
    { dimension: 'Effectiveness', value: roiMetrics.effectivenessScore },
  ], [roiMetrics, promoCodes]);

  // UAC per code
  const uacData = useMemo(() => codeEffectivenessData.map(d => ({ code: d.code, uac: d.uac, score: d.score })), [codeEffectivenessData]);

  const filteredCodes = promoCodes.filter(p => {
    const now = new Date();
    const isExpired = p.expires_at ? new Date(p.expires_at) < now : false;
    if (filterStatus === 'active' && (!p.is_active || isExpired)) return false;
    if (filterStatus === 'paused' && p.is_active) return false;
    if (filterStatus === 'expired' && !isExpired) return false;
    if (filterType !== 'all' && p.discount_type !== filterType) return false;
    if (searchQuery && !p.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditingId(p.id);
    setFormData({
      code: p.code,
      description: p.description || '',
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      min_order_amount: String(p.min_order_amount),
      max_discount_amount: p.max_discount_amount ? String(p.max_discount_amount) : '',
      applicable_order_types: p.applicable_order_types || ['food', 'store'],
      usage_limit: p.usage_limit ? String(p.usage_limit) : '',
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.code.trim()) { setFormError('Code is required'); return; }
    if (!formData.discount_value || isNaN(Number(formData.discount_value))) { setFormError('Valid discount value required'); return; }
    if (formData.applicable_order_types.length === 0) { setFormError('Select at least one service'); return; }
    setFormLoading(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_order_amount: Number(formData.min_order_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        applicable_order_types: formData.applicable_order_types,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('promo_codes').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('Promo code updated successfully');
      } else {
        const { error } = await supabase.from('promo_codes').insert({ ...payload, is_active: true, used_count: 0 });
        if (error) throw error;
        showToast('Promo code created successfully');
      }
      setShowForm(false);
      fetchCodes();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save promo code');
    } finally {
      setFormLoading(false);
    }
  };

  const togglePause = async (p: PromoCode) => {
    try {
      const { error } = await supabase.from('promo_codes').update({ is_active: !p.is_active, updated_at: new Date().toISOString() }).eq('id', p.id);
      if (error) throw error;
      showToast(p.is_active ? 'Promo code paused' : 'Promo code resumed');
      fetchCodes();
    } catch { showToast('Failed to update status', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);
      if (error) throw error;
      showToast('Promo code deleted');
      setDeleteConfirm(null);
      fetchCodes();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      if (bulkAction === 'pause') {
        await supabase.from('promo_codes').update({ is_active: false }).in('id', ids);
        showToast(`${ids.length} codes paused`);
      } else if (bulkAction === 'resume') {
        await supabase.from('promo_codes').update({ is_active: true }).in('id', ids);
        showToast(`${ids.length} codes resumed`);
      } else if (bulkAction === 'delete') {
        await supabase.from('promo_codes').delete().in('id', ids);
        showToast(`${ids.length} codes deleted`);
      }
      setSelectedIds(new Set());
      setBulkAction('');
      fetchCodes();
    } catch { showToast('Bulk action failed', 'error'); }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCodes.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredCodes.map(p => p.id)));
  };

  const getStatus = (p: PromoCode) => {
    if (!p.is_active) return 'paused';
    if (p.expires_at && new Date(p.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  const statusBadge = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'paused') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const redemptionRate = (p: PromoCode) => {
    if (!p.usage_limit) return null;
    return Math.round((p.used_count / p.usage_limit) * 100);
  };

  const stats = {
    total: promoCodes.length,
    active: promoCodes.filter(p => getStatus(p) === 'active').length,
    paused: promoCodes.filter(p => getStatus(p) === 'paused').length,
    expired: promoCodes.filter(p => getStatus(p) === 'expired').length,
    totalRedemptions: promoCodes.reduce((s, p) => s + p.used_count, 0),
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const fetchAlertData = useCallback(async () => {
    setAlertLoading(true);
    try {
      const [{ data: threshData }, { data: logsData }] = await Promise.all([
        supabase.from('promo_alert_thresholds').select('*').limit(1).single(),
        supabase.from('promo_alert_logs').select('*').order('sent_at', { ascending: false }).limit(50),
      ]);
      if (threshData) {
        setAlertThresholds(threshData);
        setThresholdForm({
          redemption_cap_pct: threshData.redemption_cap_pct,
          expiry_days_before: threshData.expiry_days_before,
          roi_target_pct: threshData.roi_target_pct,
        });
      }
      setAlertLogs(logsData || []);
    } catch (err) {
      showToast('Failed to load alert settings', 'error');
    } finally {
      setAlertLoading(false);
    }
  }, []);

  const saveAlertThresholds = async () => {
    if (!alertThresholds) return;
    setAlertSaving(true);
    try {
      const { error } = await supabase
        .from('promo_alert_thresholds')
        .update({
          redemption_cap_pct: thresholdForm.redemption_cap_pct,
          expiry_days_before: thresholdForm.expiry_days_before,
          roi_target_pct: thresholdForm.roi_target_pct,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertThresholds.id);
      if (error) throw error;
      showToast('Alert thresholds saved');
      fetchAlertData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save thresholds', 'error');
    } finally {
      setAlertSaving(false);
    }
  };

  const addAlertEmail = async () => {
    if (!alertThresholds || !newEmail.trim()) return;
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Invalid email address', 'error');
      return;
    }
    if (alertThresholds.alert_emails.includes(email)) {
      showToast('Email already added', 'error');
      return;
    }
    const updatedEmails = [...alertThresholds.alert_emails, email];
    try {
      const { error } = await supabase
        .from('promo_alert_thresholds')
        .update({ alert_emails: updatedEmails, updated_at: new Date().toISOString() })
        .eq('id', alertThresholds.id);
      if (error) throw error;
      setNewEmail('');
      showToast('Email added');
      fetchAlertData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add email', 'error');
    }
  };

  const removeAlertEmail = async (email: string) => {
    if (!alertThresholds) return;
    const updatedEmails = alertThresholds.alert_emails.filter(e => e !== email);
    try {
      const { error } = await supabase
        .from('promo_alert_thresholds')
        .update({ alert_emails: updatedEmails, updated_at: new Date().toISOString() })
        .eq('id', alertThresholds.id);
      if (error) throw error;
      showToast('Email removed');
      fetchAlertData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove email', 'error');
    }
  };

  const runAlertCheck = async () => {
    setAlertChecking(true);
    try {
      const res = await fetch('/api/promo-alerts/check', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      if (data.triggered && data.triggered.length > 0) {
        showToast(`${data.triggered.length} alert(s) triggered and sent`);
      } else {
        showToast('Check complete — no new alerts triggered');
      }
      fetchAlertData();
    } catch (err: any) {
      showToast(err.message || 'Alert check failed', 'error');
    } finally {
      setAlertChecking(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'alerts') fetchAlertData();
  }, [activeTab, fetchAlertData]);

  const alertTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
    redemption_cap: { label: 'Redemption Cap', color: 'bg-yellow-100 text-yellow-700', icon: 'AlertTriangle' },
    expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: 'XCircle' },
    expiring_soon: { label: 'Expiring Soon', color: 'bg-orange-100 text-orange-700', icon: 'Clock' },
    roi_target: { label: 'ROI Target Hit', color: 'bg-green-100 text-green-700', icon: 'TrendingUp' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <Icon name={toast.type === 'success' ? 'CheckCircle' : 'XCircle'} size={16} />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <Icon name="ArrowLeft" size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Promo Code Management</h1>
              <p className="text-xs text-gray-500 mt-0.5">Create, edit, and monitor promotional campaigns</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Icon name="Plus" size={16} />
            <span className="hidden sm:inline">Create New Promo Code</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Codes', value: stats.total, icon: 'Tag', color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Active', value: stats.active, icon: 'CheckCircle', color: 'text-green-600 bg-green-50' },
            { label: 'Paused', value: stats.paused, icon: 'PauseCircle', color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Expired', value: stats.expired, icon: 'XCircle', color: 'text-red-600 bg-red-50' },
            { label: 'Total Redemptions', value: stats.totalRedemptions, icon: 'TrendingUp', color: 'text-purple-600 bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                <Icon name={s.icon} size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('codes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'codes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="Tag" size={15} />
              Promo Codes
            </span>
          </button>
          <button
            onClick={() => setActiveTab('roi')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'roi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="TrendingUp" size={15} />
              ROI & Analytics
            </span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'alerts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="Bell" size={15} />
              Alert Settings
            </span>
          </button>
          <Link
            href="/promo-code-templates-management"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-500 hover:text-gray-700 hover:bg-white"
          >
            <span className="flex items-center gap-2">
              <Icon name="BookmarkSquare" size={15} />
              Templates
            </span>
          </Link>
        </div>

        {/* ===== ROI & ANALYTICS TAB ===== */}
        {activeTab === 'roi' && (
          <div className="space-y-6">
            {/* ROI KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Icon name="TrendingUp" size={20} className="text-indigo-600" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    roiMetrics.roi >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {roiMetrics.roi >= 0 ? '+' : ''}{roiMetrics.roi}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{roiMetrics.roi}%</div>
                <div className="text-xs text-gray-500 mt-1">Campaign ROI</div>
                <div className="text-xs text-gray-400 mt-0.5">Return on discount spend</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Icon name="DollarSign" size={20} className="text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Revenue</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">₹{roiMetrics.totalRevenueInfluenced.toLocaleString('en-IN')}</div>
                <div className="text-xs text-gray-500 mt-1">Revenue Influenced</div>
                <div className="text-xs text-gray-400 mt-0.5">Estimated orders driven</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                    <Icon name="Users" size={20} className="text-orange-600" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">UAC</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">₹{roiMetrics.uac}</div>
                <div className="text-xs text-gray-500 mt-1">User Acquisition Cost</div>
                <div className="text-xs text-gray-400 mt-0.5">Avg discount per user</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Icon name="Award" size={20} className="text-purple-600" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    roiMetrics.effectivenessScore >= 75 ? 'bg-green-100 text-green-700' :
                    roiMetrics.effectivenessScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {roiMetrics.effectivenessScore >= 75 ? 'Excellent' : roiMetrics.effectivenessScore >= 50 ? 'Good' : 'Needs Work'}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(roiMetrics.effectivenessScore)}`}>
                  {roiMetrics.effectivenessScore}/100
                </div>
                <div className="text-xs text-gray-500 mt-1">Effectiveness Score</div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getScoreBg(roiMetrics.effectivenessScore)}`}
                    style={{ width: `${roiMetrics.effectivenessScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Revenue Impact Chart + Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Impact Line Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Revenue Impact Over Time</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Revenue influenced vs discount cost by campaign month</p>
                  </div>
                  <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <Icon name="LineChart" size={18} className="text-indigo-600" />
                  </div>
                </div>
                {revenueImpactData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Icon name="BarChart2" size={32} className="mb-2 opacity-30" />
                    <p className="text-sm">No data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={revenueImpactData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                      <Tooltip formatter={(v: any) => [`₹${v}`, '']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="revenue" name="Revenue Influenced" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="discount" name="Discount Given" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Campaign Effectiveness Radar */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Campaign Effectiveness Radar</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Multi-dimensional performance across key metrics</p>
                  </div>
                  <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Icon name="Activity" size={18} className="text-purple-600" />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip formatter={(v: any) => [`${v}`, 'Score']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-Code ROI Bar Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Per-Code Revenue Impact</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Revenue influenced vs discount given per promo code</p>
                </div>
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Icon name="BarChart2" size={18} className="text-emerald-600" />
                </div>
              </div>
              {codeEffectivenessData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Icon name="BarChart2" size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">No redemptions yet — charts will appear once codes are used</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={codeEffectivenessData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v: any) => [`₹${v}`, '']} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenueInfluenced" name="Revenue Influenced" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="discountGiven" name="Discount Given" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Campaign Effectiveness Scores Table + UAC Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Effectiveness Scores */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Campaign Effectiveness Scores</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Composite score per promo code (0–100)</p>
                  </div>
                  <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Icon name="Award" size={18} className="text-yellow-600" />
                  </div>
                </div>
                {codeEffectivenessData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <Icon name="Award" size={28} className="mb-2 opacity-30" />
                    <p className="text-sm">No data yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {codeEffectivenessData.map((d, i) => (
                      <div key={d.code} className="flex items-center gap-3">
                        <div className="w-6 text-xs text-gray-400 font-medium text-right">{i + 1}</div>
                        <div className="font-mono text-sm font-bold text-gray-800 w-24 truncate">{d.code}</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{d.redemptions} redemptions</span>
                            <span className={`font-semibold ${getScoreColor(d.score)}`}>{d.score}/100</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${getScoreBg(d.score)}`}
                              style={{ width: `${d.score}%` }}
                            />
                          </div>
                        </div>
                        <div className={`text-xs font-bold w-12 text-right ${d.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {d.roi >= 0 ? '+' : ''}{d.roi}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Acquisition Cost Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">User Acquisition Cost</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Avg discount spend per user acquired per code</p>
                  </div>
                  <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Icon name="Users" size={18} className="text-orange-600" />
                  </div>
                </div>
                {uacData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Icon name="Users" size={32} className="mb-2 opacity-30" />
                    <p className="text-sm">No data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={uacData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                      <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip formatter={(v: any) => [`₹${v}`, 'UAC']} />
                      <Bar dataKey="uac" name="Acquisition Cost" radius={[0, 4, 4, 0]}>
                        {uacData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ROI Summary Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">Campaign ROI Summary</h3>
                  <p className="text-indigo-200 text-sm mt-1">Overall performance across all promo campaigns</p>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">₹{roiMetrics.totalDiscountGiven.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-indigo-200 mt-0.5">Total Spend</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">₹{roiMetrics.totalRevenueInfluenced.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-indigo-200 mt-0.5">Revenue Driven</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${roiMetrics.roi >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {roiMetrics.roi >= 0 ? '+' : ''}{roiMetrics.roi}%
                    </div>
                    <div className="text-xs text-indigo-200 mt-0.5">Net ROI</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== PROMO CODES TAB ===== */}
        {activeTab === 'codes' && (
          <>
            {/* Filters & Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by code or description..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="expired">Expired</option>
                </select>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
                <select
                  value={`${sortBy}_${sortDir}`}
                  onChange={e => {
                    const [field, dir] = e.target.value.split('_');
                    setSortBy(field as any);
                    setSortDir(dir as any);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="created_at_desc">Newest First</option>
                  <option value="created_at_asc">Oldest First</option>
                  <option value="used_count_desc">Most Used</option>
                  <option value="used_count_asc">Least Used</option>
                  <option value="expires_at_asc">Expiring Soon</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-indigo-700">{selectedIds.size} selected</span>
                <select
                  value={bulkAction}
                  onChange={e => setBulkAction(e.target.value)}
                  className="border border-indigo-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none"
                >
                  <option value="">Bulk Action</option>
                  <option value="pause">Pause Selected</option>
                  <option value="resume">Resume Selected</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="bg-indigo-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Apply
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700">
                  Clear
                </button>
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredCodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Icon name="Tag" size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">No promo codes found</p>
                  <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm font-medium hover:underline">Create your first code</button>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedIds.size === filteredCodes.length && filteredCodes.length > 0}
                              onChange={toggleSelectAll}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Validity</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Redemptions</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Services</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredCodes.map(p => {
                          const status = getStatus(p);
                          const rate = redemptionRate(p);
                          return (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(p.id)}
                                  onChange={() => toggleSelect(p.id)}
                                  className="rounded border-gray-300"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-mono font-bold text-gray-900 text-sm">{p.code}</div>
                                <div className="text-xs text-gray-500 mt-0.5 max-w-[180px] truncate">{p.description}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {p.discount_type === 'percentage' ? `${p.discount_value}%` : `₹${p.discount_value}`}
                                </div>
                                {p.min_order_amount > 0 && (
                                  <div className="text-xs text-gray-500">Min ₹{p.min_order_amount}</div>
                                )}
                                {p.max_discount_amount && (
                                  <div className="text-xs text-gray-500">Max ₹{p.max_discount_amount}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-gray-600">
                                  {p.expires_at ? new Date(p.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No expiry'}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Created {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {p.used_count}{p.usage_limit ? ` / ${p.usage_limit}` : ''}
                                </div>
                                {rate !== null && (
                                  <div className="mt-1 w-24">
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          rate >= 90 ? 'bg-red-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min(rate, 100)}%` }}
                                      />
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">{rate}% used</div>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {(p.applicable_order_types || []).map(t => (
                                    <span key={t} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium capitalize">{t}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge(status)}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setShowAnalytics(showAnalytics === p.id ? null : p.id)}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Analytics"
                                  >
                                    <Icon name="BarChart2" size={15} />
                                  </button>
                                  <button
                                    onClick={() => openEdit(p)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Icon name="Edit2" size={15} />
                                  </button>
                                  <button
                                    onClick={() => togglePause(p)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      p.is_active
                                        ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50' :'text-yellow-600 hover:text-green-600 hover:bg-green-50'
                                    }`}
                                    title={p.is_active ? 'Pause' : 'Resume'}
                                  >
                                    <Icon name={p.is_active ? 'PauseCircle' : 'PlayCircle'} size={15} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(p.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Icon name="Trash2" size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredCodes.map(p => {
                      const status = getStatus(p);
                      const rate = redemptionRate(p);
                      return (
                        <div key={p.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(p.id)}
                                onChange={() => toggleSelect(p.id)}
                                className="rounded border-gray-300 mt-0.5"
                              />
                              <div>
                                <div className="font-mono font-bold text-gray-900">{p.code}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(status)}`}>
                              {status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                            <div>
                              <span className="text-gray-400">Discount: </span>
                              <span className="font-semibold text-gray-900">
                                {p.discount_type === 'percentage' ? `${p.discount_value}%` : `₹${p.discount_value}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Used: </span>
                              <span className="font-semibold text-gray-900">{p.used_count}{p.usage_limit ? `/${p.usage_limit}` : ''}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Expires: </span>
                              {p.expires_at ? new Date(p.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : 'Never'}
                            </div>
                            <div className="flex gap-1">
                              {(p.applicable_order_types || []).map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded capitalize">{t}</span>
                              ))}
                            </div>
                          </div>
                          {rate !== null && (
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Redemption rate</span><span>{rate}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    rate >= 90 ? 'bg-red-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(rate, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(p)} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1">
                              <Icon name="Edit2" size={13} /> Edit
                            </button>
                            <button onClick={() => togglePause(p)} className={`flex-1 py-1.5 border rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                              p.is_active ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50' : 'border-green-200 text-green-700 hover:bg-green-50'
                            }`}>
                              <Icon name={p.is_active ? 'PauseCircle' : 'PlayCircle'} size={13} />
                              {p.is_active ? 'Pause' : 'Resume'}
                            </button>
                            <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                              <Icon name="Trash2" size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Analytics Panel */}
            {showAnalytics && (() => {
              const p = promoCodes.find(x => x.id === showAnalytics);
              if (!p) return null;
              const rate = p.usage_limit ? Math.round((p.used_count / p.usage_limit) * 100) : null;
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Icon name="BarChart2" size={18} className="text-indigo-600" />
                      Analytics: <span className="font-mono">{p.code}</span>
                    </h3>
                    <button onClick={() => setShowAnalytics(null)} className="text-gray-400 hover:text-gray-600">
                      <Icon name="X" size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Total Redemptions</div>
                      <div className="font-semibold text-gray-900">{p.used_count}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Discount Value</div>
                      <div className="font-semibold text-gray-900">
                        {p.discount_type === 'percentage' ? `${p.discount_value}%` : `₹${p.discount_value}`}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Cap Utilization</div>
                      <div className="font-semibold text-gray-900">
                        {rate !== null ? `${rate}%` : 'Unlimited'}
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Days Remaining</div>
                      <div className="font-semibold text-gray-900">
                        {p.expires_at ? Math.max(0, Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000)) : '∞'}
                      </div>
                    </div>
                  </div>
                  {rate !== null && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Redemption Cap Progress</span>
                        <span className="font-semibold">{p.used_count} / {p.usage_limit}</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rate >= 90 ? 'bg-red-500' : rate >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0</span><span>{rate}% utilized</span><span>{p.usage_limit}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Applicable Services</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {(p.applicable_order_types || []).map(t => (
                          <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium capitalize">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Min Order Requirement</div>
                      <div className="font-semibold text-gray-900">₹{p.min_order_amount || 0}</div>
                    </div>
                    {p.max_discount_amount && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Max Discount Cap</div>
                        <div className="font-semibold text-gray-900">₹{p.max_discount_amount}</div>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Created On</div>
                      <div className="font-semibold text-gray-900">{new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ===== ALERT SETTINGS TAB ===== */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {alertLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Email Alert Settings</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Configure thresholds and recipient emails for automated promo code alerts</p>
                  </div>
                  <button
                    onClick={runAlertCheck}
                    disabled={alertChecking}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {alertChecking ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon name="Zap" size={15} />
                    )}
                    Run Alert Check Now
                  </button>
                </div>

                {/* Threshold Settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
                      <Icon name="Sliders" size={18} className="text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Alert Thresholds</h3>
                      <p className="text-xs text-gray-500">Set the trigger conditions for each alert type</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Redemption Cap */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <span className="w-6 h-6 bg-yellow-100 rounded flex items-center justify-center text-xs">⚠️</span>
                        Redemption Cap Alert
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={thresholdForm.redemption_cap_pct}
                          onChange={e => setThresholdForm(f => ({ ...f, redemption_cap_pct: Number(e.target.value) }))}
                          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-500">% of cap used</span>
                      </div>
                      <p className="text-xs text-gray-400">Alert when redemptions reach this % of the usage limit</p>
                    </div>

                    {/* Expiry Warning */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <span className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center text-xs">⏰</span>
                        Expiry Warning
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={thresholdForm.expiry_days_before}
                          onChange={e => setThresholdForm(f => ({ ...f, expiry_days_before: Number(e.target.value) }))}
                          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-500">days before expiry</span>
                      </div>
                      <p className="text-xs text-gray-400">Alert when a code expires within this many days</p>
                    </div>

                    {/* ROI Target */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <span className="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-xs">🎯</span>
                        ROI Target
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={thresholdForm.roi_target_pct}
                          onChange={e => setThresholdForm(f => ({ ...f, roi_target_pct: Number(e.target.value) }))}
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-500">% ROI</span>
                      </div>
                      <p className="text-xs text-gray-400">Alert when a code hits this ROI percentage</p>
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <button
                      onClick={saveAlertThresholds}
                      disabled={alertSaving}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {alertSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="Save" size={15} />
                      )}
                      Save Thresholds
                    </button>
                  </div>
                </div>

                {/* Admin Email Recipients */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <Icon name="Mail" size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Alert Recipients</h3>
                      <p className="text-xs text-gray-500">Admin email addresses that will receive promo code alerts</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <input
                      type="email"
                      placeholder="admin@example.com"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addAlertEmail()}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={addAlertEmail}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Icon name="Plus" size={15} />
                      Add
                    </button>
                  </div>

                  {alertThresholds && alertThresholds.alert_emails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 border border-dashed border-gray-200 rounded-lg">
                      <Icon name="Mail" size={28} className="mb-2 opacity-30" />
                      <p className="text-sm">No recipients added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alertThresholds?.alert_emails.map(email => (
                        <div key={email} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Icon name="User" size={13} className="text-indigo-600" />
                            </div>
                            <span className="text-sm text-gray-700">{email}</span>
                          </div>
                          <button
                            onClick={() => removeAlertEmail(email)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Icon name="X" size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alert Log */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                        <Icon name="List" size={18} className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Alert History</h3>
                        <p className="text-xs text-gray-500">Recent alerts sent to admin recipients</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{alertLogs.length} records</span>
                  </div>

                  {alertLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Icon name="Bell" size={32} className="mb-2 opacity-30" />
                      <p className="text-sm">No alerts sent yet</p>
                      <p className="text-xs mt-1">Run an alert check to trigger notifications</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Code</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Alert Type</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Details</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Sent At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {alertLogs.map(log => {
                            const cfg = alertTypeConfig[log.alert_type] || { label: log.alert_type, color: 'bg-gray-100 text-gray-700', icon: 'Bell' };
                            return (
                              <tr key={log.id} className="hover:bg-gray-50">
                                <td className="py-2.5 px-3">
                                  <span className="font-mono font-bold text-gray-800 text-xs">{log.promo_code}</span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                    <Icon name={cfg.icon} size={11} />
                                    {cfg.label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-gray-500">
                                  {Object.entries(log.details || {}).slice(0, 2).map(([k, v]) => (
                                    <span key={k} className="mr-2">{k}: <strong>{String(v)}</strong></span>
                                  ))}
                                </td>
                                <td className="py-2.5 px-3 text-xs text-gray-400">
                                  {new Date(log.sent_at).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? 'Edit Promo Code' : 'Create New Promo Code'}
                </h2>
                {!editingId && searchParams.get('prefill') === '1' && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                    <Icon name="CodeBracket" size={12} />
                    Prefilled from template — add a code to deploy
                  </p>
                )}
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="X" size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. WELCOME20"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, code: generateCode() }))}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                  >
                    Auto-generate
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this promo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                  <select
                    value={formData.discount_type}
                    onChange={e => setFormData(f => ({ ...f, discount_type: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.discount_type === 'percentage' ? 'Discount %' : 'Discount ₹'} *
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={e => setFormData(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={formData.discount_type === 'percentage' ? '20' : '50'}
                    min="0"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={e => setFormData(f => ({ ...f, min_order_amount: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    value={formData.max_discount_amount}
                    onChange={e => setFormData(f => ({ ...f, max_discount_amount: e.target.value }))}
                    placeholder="Optional cap"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Usage Limit & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Redemption Cap</label>
                  <input
                    type="number"
                    value={formData.usage_limit}
                    onChange={e => setFormData(f => ({ ...f, usage_limit: e.target.value }))}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={e => setFormData(f => ({ ...f, expires_at: e.target.value }))}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Applicable Services */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicable Services *</label>
                <div className="flex gap-3">
                  {['food', 'store'].map(service => (
                    <label key={service} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.applicable_order_types.includes(service)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData(f => ({ ...f, applicable_order_types: [...f.applicable_order_types, service] }));
                          } else {
                            setFormData(f => ({ ...f, applicable_order_types: f.applicable_order_types.filter(s => s !== service) }));
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {service === 'food' ? '🍔 Food Delivery' : '🏪 Dark Store'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
                  <Icon name="AlertCircle" size={15} />
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {formLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Trash2" size={22} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Promo Code?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This action cannot be undone. The code <span className="font-mono font-bold">{promoCodes.find(p => p.id === deleteConfirm)?.code}</span> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
