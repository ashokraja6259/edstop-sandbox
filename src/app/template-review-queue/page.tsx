// FILE: src/app/template-review-queue/page.tsx

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

type Priority = 'urgent' | 'normal' | 'low';
type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'revision_requested';
type BlockerSeverity = 'critical' | 'warning' | 'info';

interface ReviewerComment {
  id: string;
  author: string;
  role: string;
  timestamp: string;
  text: string;
  type: 'comment' | 'approval' | 'rejection' | 'revision';
}

interface DeploymentBlocker {
  id: string;
  severity: BlockerSeverity;
  category: 'budget' | 'compliance' | 'overlap' | 'technical';
  title: string;
  description: string;
  resolution: string;
  resolved: boolean;
}

interface RequiredField {
  id: string;
  label: string;
  category: 'discount' | 'legal' | 'budget' | 'marketing';
  status: 'valid' | 'invalid' | 'missing';
  value?: string;
}

interface PendingTemplate {
  id: string;
  name: string;
  creator: string;
  creatorAvatar: string;
  submittedAt: string;
  status: ReviewStatus;
  priority: Priority;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrder: number;
  maxDiscount: number | null;
  redemptionCap: number | null;
  durationDays: number;
  targetAudience: string;
  campaignGoal: string;
  businessJustification: string;
  services: string[];
  category: string;
  assignedReviewer: string | null;
  comments: ReviewerComment[];
  blockers: DeploymentBlocker[];
  requiredFields: RequiredField[];
}

const MOCK_TEMPLATES: PendingTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Exam Season Boost 30%',
    creator: 'Priya Sharma',
    creatorAvatar: 'PS',
    submittedAt: '2026-02-25T09:15:00Z',
    status: 'pending',
    priority: 'urgent',
    discountType: 'percentage',
    discountValue: 30,
    minOrder: 150,
    maxDiscount: 120,
    redemptionCap: 500,
    durationDays: 14,
    targetAudience: 'All students during exam period',
    campaignGoal: 'Boost order volume during exam stress period',
    businessJustification: 'Historical data shows 42% order increase during exams. This template captures that demand with a competitive discount that maintains positive ROI based on Q1 2025 performance.',
    services: ['food', 'store'],
    category: 'seasonal',
    assignedReviewer: 'Admin Raj',
    comments: [
      { id: 'c1', author: 'Admin Raj', role: 'Senior Reviewer', timestamp: '2026-02-25T10:30:00Z', text: 'Discount value seems high. Please verify budget allocation for 500 redemptions at max cap.', type: 'comment' },
      { id: 'c2', author: 'Priya Sharma', role: 'Template Creator', timestamp: '2026-02-25T11:00:00Z', text: 'Budget confirmed with finance team. Total exposure is ₹60,000 which is within Q1 promo budget.', type: 'comment' },
    ],
    blockers: [
      { id: 'b1', severity: 'warning', category: 'overlap', title: 'Overlapping Campaign Detected', description: 'WELCOME20 promo code is active during the same period and targets the same audience.', resolution: 'Consider staggering campaign dates or restricting to new users only.', resolved: false },
    ],
    requiredFields: [
      { id: 'rf1', label: 'Discount Parameters', category: 'discount', status: 'valid', value: '30% off, min ₹150, max cap ₹120' },
      { id: 'rf2', label: 'Legal Compliance Sign-off', category: 'legal', status: 'valid', value: 'Approved by Legal - Feb 24' },
      { id: 'rf3', label: 'Budget Allocation', category: 'budget', status: 'valid', value: '₹60,000 allocated from Q1 budget' },
      { id: 'rf4', label: 'Marketing Approval', category: 'marketing', status: 'invalid', value: 'Pending marketing team sign-off' },
    ],
  },
  {
    id: 'tpl-002',
    name: 'Flat ₹75 Weekend Special',
    creator: 'Arjun Mehta',
    creatorAvatar: 'AM',
    submittedAt: '2026-02-24T14:22:00Z',
    status: 'in_review',
    priority: 'normal',
    discountType: 'flat',
    discountValue: 75,
    minOrder: 200,
    maxDiscount: null,
    redemptionCap: 1000,
    durationDays: 7,
    targetAudience: 'All users on weekends',
    campaignGoal: 'Drive weekend order volume',
    businessJustification: 'Weekend orders are 23% lower than weekdays. A flat discount incentivizes weekend ordering behavior and builds habit.',
    services: ['food'],
    category: 'engagement',
    assignedReviewer: 'Admin Priya',
    comments: [
      { id: 'c3', author: 'Admin Priya', role: 'Reviewer', timestamp: '2026-02-24T16:00:00Z', text: 'Template looks good. Checking compliance docs.', type: 'comment' },
    ],
    blockers: [
      { id: 'b2', severity: 'critical', category: 'budget', title: 'Budget Limit Exceeded', description: 'Projected total discount exposure of ₹75,000 exceeds the remaining Q1 promo budget of ₹50,000.', resolution: 'Reduce redemption cap to 667 or request budget increase from finance team.', resolved: false },
      { id: 'b3', severity: 'info', category: 'technical', title: 'Service Restriction Note', description: 'Template applies to food orders only. Store orders excluded.', resolution: 'No action required. Informational only.', resolved: true },
    ],
    requiredFields: [
      { id: 'rf5', label: 'Discount Parameters', category: 'discount', status: 'valid', value: 'Flat ₹75, min ₹200 order' },
      { id: 'rf6', label: 'Legal Compliance Sign-off', category: 'legal', status: 'missing', value: undefined },
      { id: 'rf7', label: 'Budget Allocation', category: 'budget', status: 'invalid', value: 'Exceeds available budget by ₹25,000' },
      { id: 'rf8', label: 'Marketing Approval', category: 'marketing', status: 'valid', value: 'Approved by Marketing - Feb 23' },
    ],
  },
  {
    id: 'tpl-003',
    name: 'New User Welcome 20%',
    creator: 'Sneha Patel',
    creatorAvatar: 'SP',
    submittedAt: '2026-02-23T11:05:00Z',
    status: 'in_review',
    priority: 'normal',
    discountType: 'percentage',
    discountValue: 20,
    minOrder: 100,
    maxDiscount: 80,
    redemptionCap: 2000,
    durationDays: 30,
    targetAudience: 'First-time users only',
    campaignGoal: 'Increase new user acquisition and first order conversion',
    businessJustification: 'New user conversion rate is 34%. A welcome discount increases this to projected 58% based on competitor analysis.',
    services: ['food', 'store'],
    category: 'acquisition',
    assignedReviewer: null,
    comments: [],
    blockers: [],
    requiredFields: [
      { id: 'rf9', label: 'Discount Parameters', category: 'discount', status: 'valid', value: '20% off, min ₹100, max cap ₹80' },
      { id: 'rf10', label: 'Legal Compliance Sign-off', category: 'legal', status: 'valid', value: 'Approved by Legal - Feb 22' },
      { id: 'rf11', label: 'Budget Allocation', category: 'budget', status: 'valid', value: '₹1,60,000 allocated from acquisition budget' },
      { id: 'rf12', label: 'Marketing Approval', category: 'marketing', status: 'valid', value: 'Approved by Marketing - Feb 22' },
    ],
  },
  {
    id: 'tpl-004',
    name: 'Loyalty Reward ₹50 Cashback',
    creator: 'Rahul Verma',
    creatorAvatar: 'RV',
    submittedAt: '2026-02-22T08:45:00Z',
    status: 'revision_requested',
    priority: 'low',
    discountType: 'flat',
    discountValue: 50,
    minOrder: 300,
    maxDiscount: null,
    redemptionCap: 300,
    durationDays: 21,
    targetAudience: 'Users with 10+ orders',
    campaignGoal: 'Retain high-value loyal customers',
    businessJustification: 'Top 15% of users generate 60% of revenue. Loyalty rewards reduce churn by estimated 18%.',
    services: ['food', 'store'],
    category: 'retention',
    assignedReviewer: 'Admin Raj',
    comments: [
      { id: 'c4', author: 'Admin Raj', role: 'Senior Reviewer', timestamp: '2026-02-22T14:00:00Z', text: 'Please clarify the eligibility criteria. "10+ orders" needs a time window (e.g., last 90 days).', type: 'revision' },
      { id: 'c5', author: 'Rahul Verma', role: 'Template Creator', timestamp: '2026-02-23T09:00:00Z', text: 'Updated to 10+ orders in last 90 days. Will resubmit shortly.', type: 'comment' },
    ],
    blockers: [
      { id: 'b4', severity: 'warning', category: 'compliance', title: 'Eligibility Criteria Ambiguous', description: 'The loyalty threshold "10+ orders" lacks a time window, which may cause inconsistent application.', resolution: 'Specify time window (e.g., last 30/60/90 days) in template configuration.', resolved: false },
    ],
    requiredFields: [
      { id: 'rf13', label: 'Discount Parameters', category: 'discount', status: 'valid', value: 'Flat ₹50, min ₹300 order' },
      { id: 'rf14', label: 'Legal Compliance Sign-off', category: 'legal', status: 'invalid', value: 'Pending - eligibility criteria revision needed' },
      { id: 'rf15', label: 'Budget Allocation', category: 'budget', status: 'valid', value: '₹15,000 allocated' },
      { id: 'rf16', label: 'Marketing Approval', category: 'marketing', status: 'valid', value: 'Approved by Marketing - Feb 21' },
    ],
  },
  {
    id: 'tpl-005',
    name: 'Orientation Week Bundle',
    creator: 'Kavya Nair',
    creatorAvatar: 'KN',
    submittedAt: '2026-02-21T16:30:00Z',
    status: 'pending',
    priority: 'urgent',
    discountType: 'percentage',
    discountValue: 25,
    minOrder: 120,
    maxDiscount: 100,
    redemptionCap: 800,
    durationDays: 5,
    targetAudience: 'New students during orientation week',
    campaignGoal: 'Onboard new students to the platform',
    businessJustification: 'Orientation week is the highest new user acquisition opportunity. First-week experience drives long-term retention.',
    services: ['food', 'store'],
    category: 'acquisition',
    assignedReviewer: null,
    comments: [],
    blockers: [
      { id: 'b5', severity: 'critical', category: 'technical', title: 'New User Verification System Down', description: 'The new user verification API is currently under maintenance and cannot validate first-time users.', resolution: 'Wait for maintenance window to close (ETA: Feb 27) or use manual verification fallback.', resolved: false },
    ],
    requiredFields: [
      { id: 'rf17', label: 'Discount Parameters', category: 'discount', status: 'valid', value: '25% off, min ₹120, max cap ₹100' },
      { id: 'rf18', label: 'Legal Compliance Sign-off', category: 'legal', status: 'valid', value: 'Approved by Legal - Feb 20' },
      { id: 'rf19', label: 'Budget Allocation', category: 'budget', status: 'valid', value: '₹80,000 allocated from orientation budget' },
      { id: 'rf20', label: 'Marketing Approval', category: 'marketing', status: 'missing', value: undefined },
    ],
  },
];

const REVIEWERS = ['Admin Raj', 'Admin Priya', 'Admin Kiran', 'Admin Meera'];

const priorityConfig: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' },
  normal: { label: 'Normal', color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' },
  low: { label: 'Low', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
};

const statusConfig: Record<ReviewStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: 'text-gray-700', bg: 'bg-gray-100', icon: 'Clock' },
  in_review: { label: 'In Review', color: 'text-blue-700', bg: 'bg-blue-100', icon: 'Eye' },
  approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100', icon: 'CheckCircle' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: 'XCircle' },
  revision_requested: { label: 'Revision Requested', color: 'text-orange-700', bg: 'bg-orange-100', icon: 'ArrowPath' },
};

const blockerSeverityConfig: Record<BlockerSeverity, { color: string; bg: string; border: string; icon: string; label: string }> = {
  critical: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300', icon: 'ExclamationCircle', label: 'Critical' },
  warning: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', icon: 'ExclamationTriangle', label: 'Warning' },
  info: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300', icon: 'InformationCircle', label: 'Info' },
};

const fieldCategoryConfig: Record<string, { color: string; bg: string }> = {
  discount: { color: 'text-indigo-700', bg: 'bg-indigo-50' },
  legal: { color: 'text-purple-700', bg: 'bg-purple-50' },
  budget: { color: 'text-emerald-700', bg: 'bg-emerald-50' },
  marketing: { color: 'text-pink-700', bg: 'bg-pink-50' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TemplateReviewQueue() {
  const [templates, setTemplates] = useState<PendingTemplate[]>(MOCK_TEMPLATES);
  const [selectedId, setSelectedId] = useState<string | null>('tpl-001');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [sortBy, setSortBy] = useState<'submittedAt' | 'priority' | 'status'>('submittedAt');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());
  const [expandedBlockers, setExpandedBlockers] = useState<Set<string>>(new Set());
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filteredTemplates = useMemo(() => {
    let list = [...templates];
    if (filterStatus !== 'all') list = list.filter(t => t.status === filterStatus);
    if (filterPriority !== 'all') list = list.filter(t => t.priority === filterPriority);
    if (searchQuery) list = list.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.creator.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sortBy === 'submittedAt') list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    if (sortBy === 'priority') {
      const order: Record<Priority, number> = { urgent: 0, normal: 1, low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority]);
    }
    if (sortBy === 'status') list.sort((a, b) => a.status.localeCompare(b.status));
    return list;
  }, [templates, filterStatus, filterPriority, searchQuery, sortBy]);

  const selectedTemplate = templates.find(t => t.id === selectedId) || null;

  const handleAction = (id: string, action: 'approve' | 'reject' | 'revision') => {
    if (!reviewComment.trim() && action !== 'approve') {
      showToast('Please add a comment before rejecting or requesting revision.', 'error');
      return;
    }
    setActionLoading(action);
    setTimeout(() => {
      const newStatus: ReviewStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revision_requested';
      const commentType = action === 'approve' ? 'approval' : action === 'reject' ? 'rejection' : 'revision';
      setTemplates(prev => prev.map(t => {
        if (t.id !== id) return t;
        const newComment: ReviewerComment = {
          id: `c-${Date.now()}`,
          author: 'You (Admin)',
          role: 'Reviewer',
          timestamp: new Date().toISOString(),
          text: reviewComment || `Template ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent for revision'}.`,
          type: commentType,
        };
        return { ...t, status: newStatus, comments: [...t.comments, newComment] };
      }));
      setReviewComment('');
      setActionLoading(null);
      showToast(
        action === 'approve' ? 'Template approved successfully!' :
        action === 'reject'? 'Template rejected.' : 'Revision requested from creator.',
        action === 'reject' ? 'error' : 'success'
      );
    }, 900);
  };

  const handleBatchApprove = () => {
    if (selectedBatch.size === 0) return;
    setTemplates(prev => prev.map(t => selectedBatch.has(t.id) ? { ...t, status: 'approved' } : t));
    showToast(`${selectedBatch.size} templates approved.`);
    setSelectedBatch(new Set());
  };

  const handleAssignReviewer = (id: string, reviewer: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, assignedReviewer: reviewer } : t));
    setAssigningId(null);
    showToast(`Assigned to ${reviewer}`);
  };

  const toggleBlockerExpand = (id: string) => {
    setExpandedBlockers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resolveBlocker = (templateId: string, blockerId: string) => {
    setTemplates(prev => prev.map(t => t.id !== templateId ? t : {
      ...t,
      blockers: t.blockers.map(b => b.id === blockerId ? { ...b, resolved: true } : b),
    }));
    showToast('Blocker marked as resolved.');
  };

  const criticalBlockerCount = selectedTemplate?.blockers.filter(b => b.severity === 'critical' && !b.resolved).length ?? 0;
  const allFieldsValid = selectedTemplate?.requiredFields.every(f => f.status === 'valid') ?? false;
  const canApprove = criticalBlockerCount === 0 && allFieldsValid;

  const stats = useMemo(() => ({
    total: templates.length,
    pending: templates.filter(t => t.status === 'pending').length,
    inReview: templates.filter(t => t.status === 'in_review').length,
    urgent: templates.filter(t => t.priority === 'urgent').length,
    blockers: templates.reduce((acc, t) => acc + t.blockers.filter(b => b.severity === 'critical' && !b.resolved).length, 0),
  }), [templates]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <Icon name={toast.type === 'success' ? 'CheckCircle' : 'XCircle'} className="w-4 h-4" />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/promo-code-templates-management" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Icon name="ArrowLeft" className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Icon name="ClipboardDocumentList" className="w-6 h-6 text-indigo-600" />
                Template Review Queue
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Review, approve, and manage pending promotional templates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedBatch.size > 0 && (
              <button onClick={handleBatchApprove} className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                <Icon name="CheckCircle" className="w-4 h-4" />
                Batch Approve ({selectedBatch.size})
              </button>
            )}
            <Link href="/admin-promo-code-management" className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              <Icon name="Cog6Tooth" className="w-4 h-4" />
              Promo Management
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span className="text-gray-600">Total: <strong className="text-gray-900">{stats.total}</strong></span>
          </div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-gray-600">Pending: <strong className="text-amber-700">{stats.pending}</strong></span>
          </div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-gray-600">In Review: <strong className="text-blue-700">{stats.inReview}</strong></span>
          </div>
          <div className="w-px h-4 bg-gray-200"></div>
          <div className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Urgent: <strong className="text-red-700">{stats.urgent}</strong></span>
          </div>
          {stats.blockers > 0 && (
            <>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <Icon name="ExclamationCircle" className="w-4 h-4 text-red-500" />
                <span className="text-red-700 font-medium">{stats.blockers} Critical Blocker{stats.blockers > 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Mobile toggle */}
        <div className="flex sm:hidden mb-4 rounded-lg overflow-hidden border border-gray-200">
          <button onClick={() => setMobileView('list')} className={`flex-1 py-2 text-sm font-medium ${ mobileView === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600' }`}>Queue List</button>
          <button onClick={() => setMobileView('detail')} className={`flex-1 py-2 text-sm font-medium ${ mobileView === 'detail' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600' }`}>Review Panel</button>
        </div>

        <div className="flex gap-6">
          {/* LEFT: Queue List */}
          <div className={`w-full sm:w-[420px] lg:w-[460px] flex-shrink-0 flex flex-col gap-4 ${ mobileView === 'detail' ? 'hidden sm:flex' : 'flex' }`}>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
              <div className="relative">
                <Icon name="MagnifyingGlass" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates or creators..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ReviewStatus | 'all')} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="revision_requested">Revision Requested</option>
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | 'all')} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as 'submittedAt' | 'priority' | 'status')} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="submittedAt">Sort: Date</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="status">Sort: Status</option>
                </select>
              </div>
              {selectedBatch.size > 0 && (
                <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-indigo-700 font-medium">{selectedBatch.size} selected</span>
                  <div className="flex gap-2">
                    <button onClick={handleBatchApprove} className="text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700">Batch Approve</button>
                    <button onClick={() => setSelectedBatch(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                  </div>
                </div>
              )}
            </div>

            {/* Template Cards */}
            <div className="flex flex-col gap-2">
              {filteredTemplates.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <Icon name="ClipboardDocumentList" className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No templates match your filters.</p>
                </div>
              )}
              {filteredTemplates.map(t => {
                const pc = priorityConfig[t.priority];
                const sc = statusConfig[t.status];
                const criticalCount = t.blockers.filter(b => b.severity === 'critical' && !b.resolved).length;
                const isSelected = selectedId === t.id;
                const isBatchSelected = selectedBatch.has(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => { setSelectedId(t.id); setMobileView('detail'); }}
                    className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-indigo-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isBatchSelected}
                        onChange={e => {
                          e.stopPropagation();
                          setSelectedBatch(prev => {
                            const next = new Set(prev);
                            isBatchSelected ? next.delete(t.id) : next.add(t.id);
                            return next;
                          });
                        }}
                        onClick={e => e.stopPropagation()}
                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${pc.bg} ${pc.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`}></span>
                            {pc.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                            <Icon name={sc.icon} className="w-3 h-3" />
                            {sc.label}
                          </span>
                          {criticalCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              <Icon name="ExclamationCircle" className="w-3 h-3" />
                              {criticalCount} Blocker{criticalCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{t.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{t.creatorAvatar}</div>
                          <span className="text-xs text-gray-500">{t.creator}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{formatShortDate(t.submittedAt)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                            {t.discountType === 'percentage' ? `${t.discountValue}% off` : `₹${t.discountValue} flat`}
                          </span>
                          <span className="text-xs text-gray-500">{t.durationDays}d campaign</span>
                          {t.assignedReviewer ? (
                            <span className="text-xs text-indigo-600">→ {t.assignedReviewer}</span>
                          ) : (
                            <span className="text-xs text-amber-600">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Review Panel */}
          <div className={`flex-1 min-w-0 flex flex-col gap-4 ${ mobileView === 'list' ? 'hidden sm:flex' : 'flex' }`}>
            {!selectedTemplate ? (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <Icon name="ClipboardDocumentList" className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Select a template to review</p>
                <p className="text-sm text-gray-400 mt-1">Click any template from the queue to open the review panel</p>
              </div>
            ) : (
              <>
                {/* Template Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${priorityConfig[selectedTemplate.priority].bg} ${priorityConfig[selectedTemplate.priority].color}`}>
                          <span className={`w-2 h-2 rounded-full ${priorityConfig[selectedTemplate.priority].dot}`}></span>
                          {priorityConfig[selectedTemplate.priority].label} Priority
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig[selectedTemplate.status].bg} ${statusConfig[selectedTemplate.status].color}`}>
                          <Icon name={statusConfig[selectedTemplate.status].icon} className="w-3.5 h-3.5" />
                          {statusConfig[selectedTemplate.status].label}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{selectedTemplate.creatorAvatar}</div>
                          <span className="text-sm text-gray-600">{selectedTemplate.creator}</span>
                        </div>
                        <span className="text-gray-300">·</span>
                        <span className="text-sm text-gray-500">Submitted {formatDate(selectedTemplate.submittedAt)}</span>
                      </div>
                    </div>
                    {/* Reviewer Assignment */}
                    <div className="flex flex-col items-end gap-2">
                      {assigningId === selectedTemplate.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            defaultValue=""
                            onChange={e => e.target.value && handleAssignReviewer(selectedTemplate.id, e.target.value)}
                          >
                            <option value="">Select reviewer...</option>
                            {REVIEWERS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => setAssigningId(null)} className="text-gray-400 hover:text-gray-600">
                            <Icon name="XMark" className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningId(selectedTemplate.id)}
                          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <Icon name="UserCircle" className="w-4 h-4" />
                          {selectedTemplate.assignedReviewer ? `Assigned: ${selectedTemplate.assignedReviewer}` : 'Assign Reviewer'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deployment Blockers */}
                {selectedTemplate.blockers.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Icon name="ShieldExclamation" className="w-5 h-5 text-red-500" />
                        Deployment Blockers
                      </h3>
                      <span className="text-xs text-gray-500">{selectedTemplate.blockers.filter(b => !b.resolved).length} unresolved</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {selectedTemplate.blockers.map(blocker => {
                        const bc = blockerSeverityConfig[blocker.severity];
                        const isExpanded = expandedBlockers.has(blocker.id);
                        return (
                          <div key={blocker.id} className={`p-4 ${blocker.resolved ? 'opacity-50' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 p-1.5 rounded-lg ${bc.bg}`}>
                                <Icon name={bc.icon} className={`w-4 h-4 ${bc.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${bc.bg} ${bc.color} ${bc.border}`}>{bc.label}</span>
                                  <span className="text-xs text-gray-500 capitalize">{blocker.category}</span>
                                  {blocker.resolved && <span className="text-xs text-green-600 font-medium">✓ Resolved</span>}
                                </div>
                                <p className="text-sm font-semibold text-gray-900 mt-1">{blocker.title}</p>
                                <p className="text-sm text-gray-600 mt-0.5">{blocker.description}</p>
                                <button
                                  onClick={() => toggleBlockerExpand(blocker.id)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 flex items-center gap-1"
                                >
                                  <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} className="w-3 h-3" />
                                  {isExpanded ? 'Hide' : 'Show'} Resolution Guide
                                </button>
                                {isExpanded && (
                                  <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs font-semibold text-blue-700 mb-1">Resolution:</p>
                                    <p className="text-xs text-blue-800">{blocker.resolution}</p>
                                  </div>
                                )}
                              </div>
                              {!blocker.resolved && (
                                <button
                                  onClick={() => resolveBlocker(selectedTemplate.id, blocker.id)}
                                  className="flex-shrink-0 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 font-medium"
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Template Preview + Required Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Template Preview */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Icon name="Eye" className="w-5 h-5 text-indigo-500" />
                        Template Preview
                      </h3>
                    </div>
                    <div className="p-5">
                      {/* Promo Card Preview */}
                      <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white mb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">Promo Offer</p>
                            <p className="text-3xl font-black mt-1">
                              {selectedTemplate.discountType === 'percentage' ? `${selectedTemplate.discountValue}% OFF` : `₹${selectedTemplate.discountValue} OFF`}
                            </p>
                            <p className="text-indigo-200 text-sm mt-1">on orders above ₹{selectedTemplate.minOrder}</p>
                          </div>
                          <div className="bg-white/20 rounded-xl p-3">
                            <Icon name="TagSolid" className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        {selectedTemplate.maxDiscount && (
                          <p className="text-indigo-200 text-xs mt-3">Max discount: ₹{selectedTemplate.maxDiscount}</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                          <span className="text-xs text-indigo-200">{selectedTemplate.durationDays}-day campaign</span>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{selectedTemplate.category}</span>
                        </div>
                      </div>
                      {/* Details */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Target Audience</span>
                          <span className="text-gray-900 font-medium text-right max-w-[60%]">{selectedTemplate.targetAudience}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Services</span>
                          <div className="flex gap-1">
                            {selectedTemplate.services.map(s => (
                              <span key={s} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md capitalize">{s}</span>
                            ))}
                          </div>
                        </div>
                        {selectedTemplate.redemptionCap && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Redemption Cap</span>
                            <span className="text-gray-900 font-medium">{selectedTemplate.redemptionCap.toLocaleString()} uses</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Campaign Goal</span>
                          <span className="text-gray-900 font-medium text-right max-w-[60%]">{selectedTemplate.campaignGoal}</span>
                        </div>
                      </div>
                      {/* Business Justification */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Business Justification</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{selectedTemplate.businessJustification}</p>
                      </div>
                    </div>
                  </div>

                  {/* Required Fields Checklist */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Icon name="ClipboardDocumentCheck" className="w-5 h-5 text-green-500" />
                        Required Fields Checklist
                      </h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        allFieldsValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedTemplate.requiredFields.filter(f => f.status === 'valid').length}/{selectedTemplate.requiredFields.length} Valid
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      {selectedTemplate.requiredFields.map(field => {
                        const fc = fieldCategoryConfig[field.category];
                        return (
                          <div key={field.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                            field.status === 'valid' ? 'bg-green-50 border-green-200' :
                            field.status === 'invalid'? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="mt-0.5">
                              {field.status === 'valid' ? (
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                  <Icon name="Check" className="w-3 h-3 text-white" />
                                </div>
                              ) : field.status === 'invalid' ? (
                                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                                  <Icon name="XMark" className="w-3 h-3 text-white" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                                  <Icon name="Minus" className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${fc.bg} ${fc.color}`}>{field.category}</span>
                                <span className="text-sm font-medium text-gray-900">{field.label}</span>
                              </div>
                              {field.value ? (
                                <p className="text-xs text-gray-600 mt-0.5">{field.value}</p>
                              ) : (
                                <p className="text-xs text-gray-400 mt-0.5 italic">Not provided</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {!allFieldsValid && (
                      <div className="mx-5 mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <Icon name="ExclamationTriangle" className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-800">All required fields must be valid before approval. Please resolve invalid or missing fields.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reviewer Comments Thread */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Icon name="ChatBubbleLeftRight" className="w-5 h-5 text-blue-500" />
                      Reviewer Comments
                      {selectedTemplate.comments.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedTemplate.comments.length}</span>
                      )}
                    </h3>
                  </div>
                  <div className="p-5">
                    {selectedTemplate.comments.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first to add a review note.</p>
                    ) : (
                      <div className="space-y-4 mb-5">
                        {selectedTemplate.comments.map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              comment.type === 'approval' ? 'bg-green-100 text-green-700' :
                              comment.type === 'rejection' ? 'bg-red-100 text-red-700' :
                              comment.type === 'revision'? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {comment.author.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
                                <span className="text-xs text-gray-400">{comment.role}</span>
                                {comment.type !== 'comment' && (
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    comment.type === 'approval' ? 'bg-green-100 text-green-700' :
                                    comment.type === 'rejection'? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {comment.type === 'approval' ? '✓ Approved' : comment.type === 'rejection' ? '✗ Rejected' : '↩ Revision'}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400 ml-auto">{formatDate(comment.timestamp)}</span>
                              </div>
                              <div className={`mt-1 p-3 rounded-lg text-sm text-gray-700 ${
                                comment.type === 'approval' ? 'bg-green-50 border border-green-200' :
                                comment.type === 'rejection' ? 'bg-red-50 border border-red-200' :
                                comment.type === 'revision'? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'
                              }`}>
                                {comment.text}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="border-t border-gray-100 pt-4">
                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Add a review comment, note, or feedback..."
                        rows={3}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Review Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Icon name="CheckBadge" className="w-5 h-5 text-indigo-500" />
                    Review Decision
                  </h3>

                  {!canApprove && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <Icon name="ExclamationCircle" className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Cannot Approve Yet</p>
                        <ul className="text-xs text-red-700 mt-1 space-y-0.5 list-disc list-inside">
                          {criticalBlockerCount > 0 && <li>{criticalBlockerCount} critical deployment blocker{criticalBlockerCount > 1 ? 's' : ''} must be resolved</li>}
                          {!allFieldsValid && <li>All required fields must be valid</li>}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleAction(selectedTemplate.id, 'approve')}
                      disabled={!canApprove || actionLoading !== null || selectedTemplate.status === 'approved'}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        canApprove && selectedTemplate.status !== 'approved' ?'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md' :'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {actionLoading === 'approve' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="CheckCircle" className="w-4 h-4" />
                      )}
                      {selectedTemplate.status === 'approved' ? 'Already Approved' : 'Approve Template'}
                    </button>

                    <button
                      onClick={() => handleAction(selectedTemplate.id, 'revision')}
                      disabled={actionLoading !== null || selectedTemplate.status === 'approved'}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === 'revision' ? (
                        <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="ArrowPath" className="w-4 h-4" />
                      )}
                      Request Revision
                    </button>

                    <button
                      onClick={() => handleAction(selectedTemplate.id, 'reject')}
                      disabled={actionLoading !== null || selectedTemplate.status === 'rejected'}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === 'reject' ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="XCircle" className="w-4 h-4" />
                      )}
                      {selectedTemplate.status === 'rejected' ? 'Already Rejected' : 'Reject Template'}
                    </button>

                    <button
                      onClick={() => {
                        if (criticalBlockerCount > 0) {
                          showToast('Escalating template with critical blockers to senior admin.', 'error');
                        } else {
                          showToast('Template escalated to senior admin for review.');
                        }
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 transition-all ml-auto"
                    >
                      <Icon name="ArrowUpCircle" className="w-4 h-4" />
                      Escalate
                    </button>
                  </div>

                  {selectedTemplate.status === 'approved' && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                      <Icon name="CheckCircle" className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">Template Approved</p>
                        <p className="text-xs text-green-700">This template is ready for deployment via the Promo Code Management system.</p>
                      </div>
                      <Link href="/admin-promo-code-management" className="ml-auto text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium whitespace-nowrap">
                        Deploy Now
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
