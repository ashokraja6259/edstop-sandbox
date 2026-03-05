// FILE: src/app/promo-code-templates-management/page.tsx

'use client';

import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface PromoTemplate {
  id: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  duration_days: number | null;
  applicable_order_types: string[];
  times_used: number;
  avg_performance_score: number;
  success_rate: number;
  created_at: string;
  category: string;
  // Extended metrics for AI ranking
  roi_score?: number;
  redemption_rate?: number;
  revenue_generated?: number;
}

interface TemplateVersion {
  version: number;
  timestamp: string;
  label: string;
  snapshot: PromoTemplate;
  changeNote: string;
}

type CampaignGoal = 'roi' | 'redemption_rate' | 'revenue';

// ─── Campus Calendar & Seasonal Intelligence ────────────────────────────────
interface CampusEvent {
  id: string;
  name: string;
  type: 'exam' | 'festival' | 'semester_break' | 'orientation' | 'sports' | 'holiday';
  startDate: string;
  endDate: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  icon: string;
  color: string;
  orderBehavior: string;
  recommendedCategories: string[];
}

interface SeasonalPattern {
  season: string;
  months: number[];
  icon: string;
  color: string;
  description: string;
  peakDays: string[];
  avgOrderIncrease: number;
  topCategories: string[];
}

const CAMPUS_EVENTS: CampusEvent[] = [
  {
    id: 'exam-feb',
    name: 'Mid-Semester Exams',
    type: 'exam',
    startDate: '2026-02-20',
    endDate: '2026-03-05',
    impact: 'high',
    description: 'Students under exam pressure order more food deliveries and study snacks',
    icon: 'AcademicCap',
    color: 'red',
    orderBehavior: '+42% food orders, late-night delivery spikes',
    recommendedCategories: ['engagement', 'retention'],
  },
  {
    id: 'spring-festival',
    name: 'Spring Campus Festival',
    type: 'festival',
    startDate: '2026-03-15',
    endDate: '2026-03-18',
    impact: 'high',
    description: 'Annual spring festival drives massive group orders and social spending',
    icon: 'SparklesSolid',
    color: 'pink',
    orderBehavior: '+78% group orders, peak social spending',
    recommendedCategories: ['seasonal', 'acquisition'],
  },
  {
    id: 'semester-break',
    name: 'Semester Break',
    type: 'semester_break',
    startDate: '2026-04-01',
    endDate: '2026-04-14',
    impact: 'medium',
    description: 'Reduced campus population but loyal users remain active',
    icon: 'SunSolid',
    color: 'amber',
    orderBehavior: '-35% volume, higher avg order value',
    recommendedCategories: ['retention', 'clearance'],
  },
  {
    id: 'new-student-orientation',
    name: 'New Student Orientation',
    type: 'orientation',
    startDate: '2026-01-10',
    endDate: '2026-01-17',
    impact: 'high',
    description: 'Influx of new students unfamiliar with campus services — prime acquisition window',
    icon: 'UserGroupSolid',
    color: 'blue',
    orderBehavior: '+120% new user signups, high first-order rate',
    recommendedCategories: ['acquisition'],
  },
  {
    id: 'finals-week',
    name: 'Final Exams Week',
    type: 'exam',
    startDate: '2026-05-10',
    endDate: '2026-05-22',
    impact: 'high',
    description: 'Highest stress period — students rely heavily on delivery services',
    icon: 'ClipboardDocumentList',
    color: 'red',
    orderBehavior: '+65% food orders, 24/7 demand patterns',
    recommendedCategories: ['engagement', 'retention'],
  },
  {
    id: 'sports-day',
    name: 'Inter-Faculty Sports Day',
    type: 'sports',
    startDate: '2026-03-08',
    endDate: '2026-03-09',
    impact: 'medium',
    description: 'High foot traffic and group gatherings boost store and food orders',
    icon: 'TrophySolid',
    color: 'emerald',
    orderBehavior: '+55% store orders, group food orders peak',
    recommendedCategories: ['seasonal', 'engagement'],
  },
];

const SEASONAL_PATTERNS: SeasonalPattern[] = [
  {
    season: 'Harmattan Season',
    months: [11, 12, 1, 2],
    icon: 'CloudSolid',
    color: 'orange',
    description: 'Dry, dusty weather increases demand for beverages and comfort food',
    peakDays: ['Monday', 'Wednesday', 'Friday'],
    avgOrderIncrease: 28,
    topCategories: ['engagement', 'retention'],
  },
  {
    season: 'Rainy Season',
    months: [4, 5, 6, 7, 8, 9],
    icon: 'CloudArrowDown',
    color: 'blue',
    description: 'Rain keeps students indoors — delivery demand surges significantly',
    peakDays: ['Tuesday', 'Thursday', 'Saturday'],
    avgOrderIncrease: 52,
    topCategories: ['seasonal', 'acquisition'],
  },
  {
    season: 'End-of-Year Rush',
    months: [11, 12],
    icon: 'GiftSolid',
    color: 'red',
    description: 'Holiday mood and year-end celebrations drive premium orders',
    peakDays: ['Friday', 'Saturday', 'Sunday'],
    avgOrderIncrease: 67,
    topCategories: ['seasonal', 'clearance'],
  },
  {
    season: 'New Semester Energy',
    months: [1, 9],
    icon: 'RocketLaunch',
    color: 'violet',
    description: 'Fresh semester enthusiasm — students explore new services and spend freely',
    peakDays: ['Monday', 'Tuesday', 'Wednesday'],
    avgOrderIncrease: 44,
    topCategories: ['acquisition', 'engagement'],
  },
];

function getCurrentCampusContext(): { activeEvents: CampusEvent[]; currentSeason: SeasonalPattern | null; upcomingEvents: CampusEvent[] } {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const activeEvents = CAMPUS_EVENTS.filter(e => e.startDate <= todayStr && e.endDate >= todayStr);
  const upcomingEvents = CAMPUS_EVENTS.filter(e => e.startDate > todayStr && e.startDate <= sevenDaysLater);
  const currentSeason = SEASONAL_PATTERNS.find(s => s.months.includes(currentMonth)) ?? null;

  return { activeEvents, currentSeason, upcomingEvents };
}

function getContextualRationale(
  template: PromoTemplate,
  goal: CampaignGoal,
  rank: number,
  activeEvents: CampusEvent[],
  upcomingEvents: CampusEvent[],
  currentSeason: SeasonalPattern | null
): string[] {
  const reasons: string[] = [];

  // Performance-based rationale
  if (goal === 'roi') {
    reasons.push(`ROI score of ${template.roi_score ?? template.avg_performance_score}% ranks #${rank} across all templates`);
  } else if (goal === 'redemption_rate') {
    reasons.push(`${template.redemption_rate ?? template.success_rate}% redemption rate — ${rank === 1 ? 'highest' : rank === 2 ? '2nd highest' : '3rd highest'} in your library`);
  } else {
    reasons.push(`Generated ₦${((template.revenue_generated ?? 0) / 1000).toFixed(0)}k revenue — ${rank === 1 ? 'top earner' : `#${rank} revenue performer`}`);
  }

  // Campus event rationale
  const allEvents = [...activeEvents, ...upcomingEvents];
  for (const event of allEvents) {
    if (event.recommendedCategories.includes(template.category)) {
      const timing = activeEvents.includes(event) ? 'Currently active' : 'Starting soon';
      reasons.push(`${timing}: ${event.name} — ${event.orderBehavior}`);
      break;
    }
  }

  // Seasonal rationale
  if (currentSeason && currentSeason.topCategories.includes(template.category)) {
    reasons.push(`${currentSeason.season} pattern: +${currentSeason.avgOrderIncrease}% avg order increase on ${currentSeason.peakDays.slice(0, 2).join(' & ')}`);
  }

  // Category-specific rationale
  if (template.category === 'acquisition' && allEvents.some(e => e.type === 'orientation')) {
    reasons.push('New Student Orientation window — ideal for first-time user acquisition campaigns');
  }
  if (template.category === 'retention' && allEvents.some(e => e.type === 'exam')) {
    reasons.push('Exam period loyalty boost — retained users order 3.2× more during high-stress weeks');
  }
  if (template.category === 'seasonal' && allEvents.some(e => e.type === 'festival')) {
    reasons.push('Festival season amplifier — seasonal promos see 2.1× higher share rates during events');
  }

  // Duration fit rationale
  if (template.duration_days) {
    const upcomingEvent = upcomingEvents[0];
    if (upcomingEvent) {
      const daysUntil = Math.ceil((new Date(upcomingEvent.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (template.duration_days <= daysUntil + 3) {
        reasons.push(`${template.duration_days}-day duration aligns well with upcoming ${upcomingEvent.name} window`);
      }
    }
  }

  return reasons.slice(0, 3);
}
// ─────────────────────────────────────────────────────────────────────────────

const CAMPAIGN_GOALS: { value: CampaignGoal; label: string; icon: string; description: string; color: string }[] = [
  { value: 'roi', label: 'Maximize ROI', icon: 'ChartBar', description: 'Best return on investment', color: 'emerald' },
  { value: 'redemption_rate', label: 'Boost Redemptions', icon: 'TicketSolid', description: 'Highest redemption rate', color: 'blue' },
  { value: 'revenue', label: 'Drive Revenue', icon: 'CurrencyDollar', description: 'Maximum revenue generated', color: 'amber' },
];

const MOCK_TEMPLATES: PromoTemplate[] = [
  {
    id: '1',
    name: 'Weekend Flash Sale',
    description: '20% off for weekend promotions with moderate redemption cap',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_amount: 500,
    max_discount_amount: 200,
    usage_limit: 100,
    duration_days: 2,
    applicable_order_types: ['food', 'store'],
    times_used: 14,
    avg_performance_score: 87,
    success_rate: 92,
    created_at: '2026-01-15',
    category: 'seasonal',
    roi_score: 84,
    redemption_rate: 78,
    revenue_generated: 142000,
  },
  {
    id: '2',
    name: 'New User Welcome',
    description: 'Flat ₦500 off for first-time users to boost acquisition',
    discount_type: 'flat',
    discount_value: 500,
    min_order_amount: 1000,
    max_discount_amount: null,
    usage_limit: 1,
    duration_days: 7,
    applicable_order_types: ['food', 'store'],
    times_used: 32,
    avg_performance_score: 94,
    success_rate: 98,
    created_at: '2026-01-20',
    category: 'acquisition',
    roi_score: 91,
    redemption_rate: 96,
    revenue_generated: 218000,
  },
  {
    id: '3',
    name: 'Loyalty Reward',
    description: '15% off for returning customers with high order value',
    discount_type: 'percentage',
    discount_value: 15,
    min_order_amount: 2000,
    max_discount_amount: 300,
    usage_limit: 50,
    duration_days: 3,
    applicable_order_types: ['food'],
    times_used: 8,
    avg_performance_score: 78,
    success_rate: 85,
    created_at: '2026-02-01',
    category: 'retention',
    roi_score: 76,
    redemption_rate: 62,
    revenue_generated: 98000,
  },
  {
    id: '4',
    name: 'Store Clearance',
    description: '30% off store items to clear inventory quickly',
    discount_type: 'percentage',
    discount_value: 30,
    min_order_amount: 300,
    max_discount_amount: 500,
    usage_limit: 200,
    duration_days: 1,
    applicable_order_types: ['store'],
    times_used: 5,
    avg_performance_score: 72,
    success_rate: 80,
    created_at: '2026-02-10',
    category: 'clearance',
    roi_score: 58,
    redemption_rate: 71,
    revenue_generated: 54000,
  },
  {
    id: '5',
    name: 'Referral Bonus',
    description: 'Flat ₦300 off for users referred by existing customers',
    discount_type: 'flat',
    discount_value: 300,
    min_order_amount: 800,
    max_discount_amount: null,
    usage_limit: 1,
    duration_days: 14,
    applicable_order_types: ['food', 'store'],
    times_used: 21,
    avg_performance_score: 89,
    success_rate: 95,
    created_at: '2026-02-15',
    category: 'acquisition',
    roi_score: 88,
    redemption_rate: 91,
    revenue_generated: 176000,
  },
  {
    id: '6',
    name: 'Midweek Boost',
    description: '10% off on Tuesdays and Wednesdays to drive off-peak orders',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 400,
    max_discount_amount: 150,
    usage_limit: 300,
    duration_days: 1,
    applicable_order_types: ['food'],
    times_used: 18,
    avg_performance_score: 81,
    success_rate: 88,
    created_at: '2026-02-18',
    category: 'engagement',
    roi_score: 79,
    redemption_rate: 83,
    revenue_generated: 124000,
  },
];

// Seed version history for existing templates
const INITIAL_VERSION_HISTORY: Record<string, TemplateVersion[]> = {
  '1': [
    { version: 1, timestamp: '2026-01-15 09:00', label: 'v1', snapshot: { ...MOCK_TEMPLATES[0], discount_value: 15, usage_limit: 50 }, changeNote: 'Initial creation' },
    { version: 2, timestamp: '2026-01-20 14:30', label: 'v2', snapshot: { ...MOCK_TEMPLATES[0], discount_value: 18, usage_limit: 80 }, changeNote: 'Increased discount to 18%' },
    { version: 3, timestamp: '2026-02-01 10:00', label: 'v3 (current)', snapshot: { ...MOCK_TEMPLATES[0] }, changeNote: 'Raised to 20%, cap 100' },
  ],
  '2': [
    { version: 1, timestamp: '2026-01-20 11:00', label: 'v1', snapshot: { ...MOCK_TEMPLATES[1], discount_value: 300 }, changeNote: 'Initial creation with ₦300' },
    { version: 2, timestamp: '2026-02-05 09:15', label: 'v2 (current)', snapshot: { ...MOCK_TEMPLATES[1] }, changeNote: 'Increased to ₦500 for better conversion' },
  ],
};

const DURATION_PRESETS = [
  { label: '1 Day', value: 1 },
  { label: '3 Days', value: 3 },
  { label: '1 Week', value: 7 },
  { label: '2 Weeks', value: 14 },
  { label: 'Custom', value: -1 },
];

const CATEGORIES = ['all', 'seasonal', 'acquisition', 'retention', 'clearance', 'engagement'];

interface TemplateForm {
  name: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: string;
  min_order_amount: string;
  max_discount_amount: string;
  usage_limit: string;
  duration_preset: number;
  custom_duration: string;
  applicable_order_types: string[];
  category: string;
}

const defaultForm: TemplateForm = {
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '0',
  max_discount_amount: '',
  usage_limit: '',
  duration_preset: 7,
  custom_duration: '',
  applicable_order_types: ['food', 'store'],
  category: 'seasonal',
};

function getPerformanceColor(score: number): string {
  if (score >= 90) return 'text-emerald-600 bg-emerald-50';
  if (score >= 75) return 'text-blue-600 bg-blue-50';
  if (score >= 60) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function getPerformanceBadge(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  return 'Low';
}

function CompareField({ label, a, b }: { label: string; a: ReactNode; b: ReactNode }) {
  const aStr = String(a);
  const bStr = String(b);
  const diff = aStr !== bStr;
  return (
    <div className={`grid grid-cols-2 gap-0 border-b border-gray-100 last:border-0 ${diff ? 'bg-amber-50' : ''}`}>
      <div className="px-4 py-2.5 border-r border-gray-100">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${diff ? 'text-amber-700' : 'text-gray-800'}`}>{a}</p>
      </div>
      <div className="px-4 py-2.5">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${diff ? 'text-amber-700' : 'text-gray-800'}`}>{b}</p>
      </div>
    </div>
  );
}

// ─── AI Suggestion Widget ───────────────────────────────────────────────────
function getRankMetric(t: PromoTemplate, goal: CampaignGoal): number {
  if (goal === 'roi') return t.roi_score ?? t.avg_performance_score;
  if (goal === 'redemption_rate') return t.redemption_rate ?? t.success_rate;
  return t.revenue_generated ?? t.times_used * 1000;
}

function getMetricLabel(goal: CampaignGoal): string {
  if (goal === 'roi') return 'ROI Score';
  if (goal === 'redemption_rate') return 'Redemption Rate';
  return 'Revenue';
}

function formatMetricValue(value: number, goal: CampaignGoal): string {
  if (goal === 'revenue') return `₦${(value / 1000).toFixed(0)}k`;
  return `${value}%`;
}

function getRankBadge(rank: number): { label: string; color: string } {
  if (rank === 1) return { label: '🥇 #1 Pick', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
  if (rank === 2) return { label: '🥈 #2 Pick', color: 'bg-gray-100 text-gray-700 border border-gray-200' };
  if (rank === 3) return { label: '🥉 #3 Pick', color: 'bg-orange-50 text-orange-700 border border-orange-200' };
  return { label: `#${rank}`, color: 'bg-gray-50 text-gray-500 border border-gray-100' };
}

function getGoalInsight(goal: CampaignGoal, topTemplate: PromoTemplate): string {
  if (goal === 'roi') return `"${topTemplate.name}" delivers the highest return on spend with a ${topTemplate.roi_score ?? topTemplate.avg_performance_score}% ROI score — ideal for cost-efficient campaigns.`;
  if (goal === 'redemption_rate') return `"${topTemplate.name}" achieves the highest redemption rate at ${topTemplate.redemption_rate ?? topTemplate.success_rate}% — best for maximizing customer engagement.`;
  return `"${topTemplate.name}" has generated the most revenue (₦${((topTemplate.revenue_generated ?? 0) / 1000).toFixed(0)}k) — optimal for revenue-driven campaigns.`;
}

interface AISuggestionWidgetProps {
  templates: PromoTemplate[];
  onSelectTemplate: (template: PromoTemplate) => void;
}

function AISuggestionWidget({ templates, onSelectTemplate }: AISuggestionWidgetProps) {
  const [selectedGoal, setSelectedGoal] = useState<CampaignGoal | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'calendar' | 'seasonal' | 'ranking' | 'done'>('idle');

  const campusContext = useMemo(() => getCurrentCampusContext(), []);

  const rankedTemplates = useMemo(() => {
    if (!selectedGoal) return [];
    const eligible = templates.filter(t => t.times_used > 0 || (t.roi_score ?? 0) > 0 || (t.revenue_generated ?? 0) > 0);
    return [...eligible]
      .sort((a, b) => getRankMetric(b, selectedGoal) - getRankMetric(a, selectedGoal))
      .slice(0, 3);
  }, [templates, selectedGoal]);

  const handleGoalSelect = (goal: CampaignGoal) => {
    if (selectedGoal === goal) return;
    setIsAnalyzing(true);
    setAnalysisPhase('calendar');
    setSelectedGoal(goal);
    setTimeout(() => setAnalysisPhase('seasonal'), 700);
    setTimeout(() => setAnalysisPhase('ranking'), 1400);
    setTimeout(() => { setIsAnalyzing(false); setAnalysisPhase('done'); }, 2100);
  };

  const topTemplate = rankedTemplates[0];
  const { activeEvents, currentSeason, upcomingEvents } = campusContext;
  const hasContext = activeEvents.length > 0 || upcomingEvents.length > 0 || currentSeason !== null;

  const eventTypeColor: Record<CampusEvent['type'], string> = {
    exam: 'bg-red-100 text-red-700 border-red-200',
    festival: 'bg-pink-100 text-pink-700 border-pink-200',
    semester_break: 'bg-amber-100 text-amber-700 border-amber-200',
    orientation: 'bg-blue-100 text-blue-700 border-blue-200',
    sports: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    holiday: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  const impactDot: Record<CampusEvent['impact'], string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-gray-400',
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 border border-indigo-200 rounded-xl mb-6 overflow-hidden">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Icon name="SparklesSolid" size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">AI Template Suggestions</h3>
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">Beta</span>
              {hasContext && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
                  Context-Aware
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Analyzes campus events, seasonal patterns &amp; historical ROI to rank templates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalendar(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showCalendar
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :'bg-white/70 text-gray-600 border-gray-200 hover:bg-white hover:border-gray-300'
            }`}
          >
            <Icon name="CalendarDays" size={13} />
            Campus Calendar
            {(activeEvents.length > 0 || upcomingEvents.length > 0) && (
              <span className="w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {activeEvents.length + upcomingEvents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsExpanded(p => !p)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition-colors"
          >
            <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={16} />
          </button>
        </div>
      </div>

      {/* Campus Calendar Panel */}
      {showCalendar && (
        <div className="mx-5 mb-4 bg-white/80 border border-indigo-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="CalendarDays" size={15} className="text-indigo-500" />
              <span className="text-xs font-bold text-gray-800">Campus Calendar Intelligence</span>
            </div>
            {currentSeason && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium bg-${currentSeason.color}-100 text-${currentSeason.color}-700 border border-${currentSeason.color}-200`}>
                {currentSeason.icon === 'CloudSolid' ? '🌫️' : currentSeason.icon === 'CloudArrowDown' ? '🌧️' : currentSeason.icon === 'GiftSolid' ? '🎁' : '🚀'} {currentSeason.season}
              </span>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* Current Season */}
            {currentSeason && (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="ChartBar" size={15} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-indigo-800">{currentSeason.season}</p>
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">+{currentSeason.avgOrderIncrease}% orders</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{currentSeason.description}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-gray-500">Peak days:</span>
                      {currentSeason.peakDays.map(d => (
                        <span key={d} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-medium">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Events */}
            {activeEvents.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">🔴 Active Now</p>
                <div className="space-y-2">
                  {activeEvents.map(event => (
                    <div key={event.id} className={`flex items-start gap-3 p-3 rounded-lg border ${eventTypeColor[event.type]}`}>
                      <Icon name={event.icon as any} size={15} className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-semibold">{event.name}</p>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${impactDot[event.impact]}`} />
                          <span className="text-xs opacity-70 capitalize">{event.impact} impact</span>
                        </div>
                        <p className="text-xs opacity-80 mb-1">{event.description}</p>
                        <p className="text-xs font-medium opacity-90">📊 {event.orderBehavior}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">📅 Upcoming (7 days)</p>
                <div className="space-y-2">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <Icon name={event.icon as any} size={15} className="text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-gray-700">{event.name}</p>
                          <span className="text-xs text-gray-400">{event.startDate}</span>
                        </div>
                        <p className="text-xs text-gray-500">{event.orderBehavior}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeEvents.length === 0 && upcomingEvents.length === 0 && (
              <div className="flex items-center gap-2 text-gray-400 py-2">
                <Icon name="CalendarDays" size={15} />
                <p className="text-xs">No active or upcoming campus events in the next 7 days.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="px-5 pb-5">
          {/* Goal Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            {CAMPAIGN_GOALS.map(goal => (
              <button
                key={goal.value}
                onClick={() => handleGoalSelect(goal.value)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  selectedGoal === goal.value
                    ? goal.color === 'emerald' ?'border-emerald-500 bg-emerald-50 shadow-sm'
                      : goal.color === 'blue' ?'border-blue-500 bg-blue-50 shadow-sm' :'border-amber-500 bg-amber-50 shadow-sm' :'border-white bg-white/70 hover:bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedGoal === goal.value
                    ? goal.color === 'emerald' ? 'bg-emerald-100' : goal.color === 'blue' ? 'bg-blue-100' : 'bg-amber-100' :'bg-gray-100'
                }`}>
                  <Icon
                    name={goal.icon as any}
                    size={16}
                    className={selectedGoal === goal.value
                      ? goal.color === 'emerald' ? 'text-emerald-600' : goal.color === 'blue' ? 'text-blue-600' : 'text-amber-600' :'text-gray-500'
                    }
                  />
                </div>
                <div>
                  <p className={`text-xs font-semibold ${
                    selectedGoal === goal.value
                      ? goal.color === 'emerald' ? 'text-emerald-800' : goal.color === 'blue' ? 'text-blue-800' : 'text-amber-800' :'text-gray-700'
                  }`}>{goal.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{goal.description}</p>
                </div>
                {selectedGoal === goal.value && (
                  <Icon name="CheckCircleSolid" size={16} className={`ml-auto flex-shrink-0 ${
                    goal.color === 'emerald' ? 'text-emerald-500' : goal.color === 'blue' ? 'text-blue-500' : 'text-amber-500'
                  }`} />
                )}
              </button>
            ))}
          </div>

          {/* Results */}
          {!selectedGoal && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3 border border-white">
                <Icon name="LightBulb" size={18} className="text-indigo-400 flex-shrink-0" />
                <p className="text-sm text-gray-500">Choose a campaign goal above to get AI-ranked recommendations based on campus events, seasonal patterns &amp; historical performance.</p>
              </div>
              {hasContext && (
                <div className="flex items-start gap-3 bg-white/50 rounded-xl px-4 py-3 border border-indigo-100">
                  <Icon name="MapPin" size={15} className="text-violet-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-violet-700 mb-1">Campus Context Detected</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeEvents.map(e => (
                        <span key={e.id} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                          🔴 {e.name}
                        </span>
                      ))}
                      {upcomingEvents.map(e => (
                        <span key={e.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                          📅 {e.name}
                        </span>
                      ))}
                      {currentSeason && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                          🌐 {currentSeason.season}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedGoal && isAnalyzing && (
            <div className="bg-white/60 rounded-xl px-4 py-4 border border-white space-y-2.5">
              <div className={`flex items-center gap-3 transition-all ${
                analysisPhase === 'calendar' ? 'opacity-100' : 'opacity-50'
              }`}>
                <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
                  analysisPhase === 'calendar' ? '' : 'opacity-60'
                }`}>
                  {analysisPhase === 'calendar'
                    ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    : analysisPhase === 'seasonal' || analysisPhase === 'ranking' || analysisPhase === 'done'
                      ? <Icon name="CheckCircleSolid" size={16} className="text-emerald-500" />
                      : <div className="w-4 h-4 border-2 border-gray-200 rounded-full" />}
                </div>
                <p className={`text-xs font-medium ${
                  analysisPhase === 'calendar' ? 'text-indigo-600' : 'text-gray-400'
                }`}>Scanning campus calendar events &amp; upcoming activities...</p>
              </div>
              <div className={`flex items-center gap-3 transition-all ${
                analysisPhase === 'seasonal' ? 'opacity-100' : analysisPhase === 'calendar' ? 'opacity-30' : 'opacity-50'
              }`}>
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {analysisPhase === 'seasonal'
                    ? <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    : analysisPhase === 'ranking' || analysisPhase === 'done'
                      ? <Icon name="CheckCircleSolid" size={16} className="text-emerald-500" />
                      : <div className="w-4 h-4 border-2 border-gray-200 rounded-full" />}
                </div>
                <p className={`text-xs font-medium ${
                  analysisPhase === 'seasonal' ? 'text-violet-600' : 'text-gray-400'
                }`}>Analyzing seasonal order patterns &amp; behavioral trends...</p>
              </div>
              <div className={`flex items-center gap-3 transition-all ${
                analysisPhase === 'ranking' ? 'opacity-100' : 'opacity-30'
              }`}>
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {analysisPhase === 'ranking'
                    ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    : <div className="w-4 h-4 border-2 border-gray-200 rounded-full" />}
                </div>
                <p className={`text-xs font-medium ${
                  analysisPhase === 'ranking' ? 'text-blue-600' : 'text-gray-400'
                }`}>Ranking templates by {selectedGoal === 'roi' ? 'ROI' : selectedGoal === 'redemption_rate' ? 'redemption rate' : 'revenue'} with context weighting...</p>
              </div>
            </div>
          )}

          {selectedGoal && !isAnalyzing && rankedTemplates.length === 0 && (
            <div className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3 border border-white">
              <Icon name="ExclamationCircle" size={18} className="text-amber-400 flex-shrink-0" />
              <p className="text-sm text-gray-500">Not enough historical data yet. Deploy some templates to unlock AI recommendations.</p>
            </div>
          )}

          {selectedGoal && !isAnalyzing && rankedTemplates.length > 0 && (
            <div className="space-y-3">
              {/* Context Summary Banner */}
              {hasContext && (
                <div className="flex items-start gap-2.5 bg-white/70 border border-violet-100 rounded-xl px-4 py-3">
                  <Icon name="MapPin" size={15} className="text-violet-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-violet-700 mb-1.5">Context signals used in this analysis:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeEvents.map(e => (
                        <span key={e.id} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                          🔴 {e.name}
                        </span>
                      ))}
                      {upcomingEvents.map(e => (
                        <span key={e.id} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                          📅 {e.name}
                        </span>
                      ))}
                      {currentSeason && (
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                          🌐 {currentSeason.season} (+{currentSeason.avgOrderIncrease}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insight Banner */}
              {topTemplate && (
                <div className="flex items-start gap-2.5 bg-white/70 border border-indigo-100 rounded-xl px-4 py-3">
                  <Icon name="SparklesSolid" size={15} className="text-violet-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <span className="font-semibold text-violet-700">AI Insight: </span>
                    {getGoalInsight(selectedGoal, topTemplate)}
                    {activeEvents.length > 0 && ` Timing aligns with ${activeEvents[0].name} — ${activeEvents[0].orderBehavior.split(',')[0].toLowerCase()}.`}
                    {!activeEvents.length && currentSeason && ` ${currentSeason.season} conditions further amplify expected performance.`}
                  </p>
                </div>
              )}

              {/* Ranked Template Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rankedTemplates.map((template, index) => {
                  const rank = index + 1;
                  const badge = getRankBadge(rank);
                  const metricValue = getRankMetric(template, selectedGoal);
                  const metricLabel = getMetricLabel(selectedGoal);
                  const formattedValue = formatMetricValue(metricValue, selectedGoal);
                  const goalConfig = CAMPAIGN_GOALS.find(g => g.value === selectedGoal)!;
                  const rationale = getContextualRationale(template, selectedGoal, rank, activeEvents, upcomingEvents, currentSeason);

                  return (
                    <div
                      key={template.id}
                      className={`bg-white rounded-xl border-2 p-4 transition-all hover:shadow-md flex flex-col ${
                        rank === 1 ? 'border-amber-300 shadow-sm' : 'border-gray-200'
                      }`}
                    >
                      {/* Rank + Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                          goalConfig.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                          goalConfig.color === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {formattedValue}
                        </span>
                      </div>

                      {/* Template Info */}
                      <h4 className="text-sm font-semibold text-gray-900 mb-0.5 truncate">{template.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{template.description}</p>

                      {/* Metric Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{metricLabel}</span>
                          <span className="font-medium text-gray-600">{formattedValue}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              goalConfig.color === 'emerald' ? 'bg-emerald-500' :
                              goalConfig.color === 'blue' ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, selectedGoal === 'revenue' ? (metricValue / 2500) : metricValue)}%` }}
                          />
                        </div>
                      </div>

                      {/* Discount config */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-medium">
                          {template.discount_type === 'percentage' ? `${template.discount_value}% OFF` : `₦${template.discount_value} OFF`}
                        </span>
                        {template.duration_days && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{template.duration_days}d</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-lg capitalize ${
                          template.category === 'acquisition' ? 'bg-blue-50 text-blue-600' :
                          template.category === 'retention' ? 'bg-purple-50 text-purple-600' :
                          template.category === 'seasonal' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                        }`}>{template.category}</span>
                      </div>

                      {/* Rationale Section */}
                      {rationale.length > 0 && (
                        <div className="mb-3 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                            <Icon name="LightBulb" size={11} className="text-amber-500" />
                            Why this template?
                          </p>
                          <ul className="space-y-1">
                            {rationale.map((reason, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-indigo-400 mt-0.5 flex-shrink-0 text-xs">•</span>
                                <span className="text-xs text-gray-600 leading-relaxed">{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Use Template Button */}
                      <button
                        onClick={() => onSelectTemplate(template)}
                        className={`mt-auto w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                          rank === 1
                            ? goalConfig.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                              goalConfig.color === 'blue'? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white' :'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <Icon name="RocketLaunch" size={12} />
                        {rank === 1 ? 'Use Top Pick' : 'Use Template'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function PromoCodeTemplatesManagement() {
  const [templates, setTemplates] = useState<PromoTemplate[]>(MOCK_TEMPLATES);
  const [versionHistory, setVersionHistory] = useState<Record<string, TemplateVersion[]>>(INITIAL_VERSION_HISTORY);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateForm>(defaultForm);
  const [formError, setFormError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'percentage' | 'flat'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'times_used' | 'avg_performance_score'>('created_at');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PromoTemplate | null>(null);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // New feature states
  const [historyTemplate, setHistoryTemplate] = useState<PromoTemplate | null>(null);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [showCompare, setShowCompare] = useState(false);
  const [rollbackConfirm, setRollbackConfirm] = useState<{ templateId: string; version: TemplateVersion } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    let list = [...templates];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (filterCategory !== 'all') list = list.filter(t => t.category === filterCategory);
    if (filterType !== 'all') list = list.filter(t => t.discount_type === filterType);
    list.sort((a, b) => {
      if (sortBy === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'times_used') return b.times_used - a.times_used;
      return b.avg_performance_score - a.avg_performance_score;
    });
    return list;
  }, [templates, searchQuery, filterCategory, filterType, sortBy]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (t: PromoTemplate) => {
    setEditingId(t.id);
    setFormData({
      name: t.name,
      description: t.description,
      discount_type: t.discount_type,
      discount_value: String(t.discount_value),
      min_order_amount: String(t.min_order_amount),
      max_discount_amount: t.max_discount_amount ? String(t.max_discount_amount) : '',
      usage_limit: t.usage_limit ? String(t.usage_limit) : '',
      duration_preset: DURATION_PRESETS.find(d => d.value === t.duration_days) ? t.duration_days ?? 7 : -1,
      custom_duration: DURATION_PRESETS.find(d => d.value === t.duration_days) ? '' : String(t.duration_days ?? ''),
      applicable_order_types: [...t.applicable_order_types],
      category: t.category,
    });
    setFormError('');
    setShowForm(true);
  };

  // Clone template
  const handleClone = (t: PromoTemplate) => {
    const cloneId = Date.now().toString();
    const cloned: PromoTemplate = {
      ...t,
      id: cloneId,
      name: `${t.name} (Copy)`,
      times_used: 0,
      avg_performance_score: 0,
      success_rate: 0,
      created_at: new Date().toISOString().split('T')[0],
    };
    setTemplates(prev => [cloned, ...prev]);
    // Seed version history for clone
    const now = new Date().toLocaleString('en-GB', { hour12: false }).replace(',', '');
    setVersionHistory(prev => ({
      ...prev,
      [cloneId]: [{ version: 1, timestamp: now, label: 'v1 (current)', snapshot: cloned, changeNote: `Cloned from "${t.name}"` }],
    }));
    showToast(`"${t.name}" cloned successfully`);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) { setFormError('Template name is required'); return; }
    if (!formData.discount_value || isNaN(Number(formData.discount_value))) { setFormError('Valid discount value is required'); return; }
    if (formData.discount_type === 'percentage' && (Number(formData.discount_value) <= 0 || Number(formData.discount_value) > 100)) {
      setFormError('Percentage must be between 1 and 100'); return;
    }
    if (formData.applicable_order_types.length === 0) { setFormError('Select at least one service type'); return; }

    const duration = formData.duration_preset === -1 ? (Number(formData.custom_duration) || null) : formData.duration_preset;
    const now = new Date().toLocaleString('en-GB', { hour12: false }).replace(',', '');

    if (editingId) {
      const updated: PromoTemplate = {
        ...templates.find(t => t.id === editingId)!,
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_order_amount: Number(formData.min_order_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        duration_days: duration,
        applicable_order_types: formData.applicable_order_types,
        category: formData.category,
      };
      setTemplates(prev => prev.map(t => t.id === editingId ? updated : t));
      // Add version history entry
      setVersionHistory(prev => {
        const existing = prev[editingId] || [];
        const nextVer = (existing[existing.length - 1]?.version ?? 0) + 1;
        const prevVersions = existing.map(v => ({ ...v, label: v.label.replace(' (current)', '') }));
        return {
          ...prev,
          [editingId]: [
            ...prevVersions,
            { version: nextVer, timestamp: now, label: `v${nextVer} (current)`, snapshot: updated, changeNote: 'Manual edit' },
          ],
        };
      });
      showToast('Template updated successfully');
    } else {
      const newId = Date.now().toString();
      const newTemplate: PromoTemplate = {
        id: newId,
        name: formData.name,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        min_order_amount: Number(formData.min_order_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        duration_days: duration,
        applicable_order_types: formData.applicable_order_types,
        times_used: 0,
        avg_performance_score: 0,
        success_rate: 0,
        created_at: new Date().toISOString().split('T')[0],
        category: formData.category,
      };
      setTemplates(prev => [newTemplate, ...prev]);
      setVersionHistory(prev => ({
        ...prev,
        [newId]: [{ version: 1, timestamp: now, label: 'v1 (current)', snapshot: newTemplate, changeNote: 'Initial creation' }],
      }));
      showToast('Template created successfully');
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    setVersionHistory(prev => { const n = { ...prev }; delete n[id]; return n; });
    setDeleteConfirm(null);
    showToast('Template deleted');
  };

  const handleBulkDelete = () => {
    setTemplates(prev => prev.filter(t => !selectedIds.has(t.id)));
    setVersionHistory(prev => {
      const n = { ...prev };
      selectedIds.forEach(id => delete n[id]);
      return n;
    });
    setSelectedIds(new Set());
    showToast(`${selectedIds.size} templates deleted`);
  };

  const handleDeployAsCode = (template: PromoTemplate) => {
    setPreviewTemplate(template);
    showToast(`Template "${template.name}" opened in Admin Promo creation modal`);
  };

  const handleDeploy = (t: PromoTemplate) => {
    setDeployingId(t.id);
    setTimeout(() => {
      setDeployingId(null);
      showToast(`Campaign from "${t.name}" deployed successfully!`);
    }, 1200);
  };

  // Rollback to a version
  const handleRollback = (templateId: string, version: TemplateVersion) => {
    const now = new Date().toLocaleString('en-GB', { hour12: false }).replace(',', '');
    setTemplates(prev => prev.map(t => t.id === templateId ? { ...version.snapshot, id: templateId } : t));
    setVersionHistory(prev => {
      const existing = prev[templateId] || [];
      const nextVer = (existing[existing.length - 1]?.version ?? 0) + 1;
      const prevVersions = existing.map(v => ({ ...v, label: v.label.replace(' (current)', '') }));
      return {
        ...prev,
        [templateId]: [
          ...prevVersions,
          { version: nextVer, timestamp: now, label: `v${nextVer} (current)`, snapshot: { ...version.snapshot, id: templateId }, changeNote: `Rolled back to v${version.version}` },
        ],
      };
    });
    setRollbackConfirm(null);
    setHistoryTemplate(null);
    showToast(`Rolled back to version ${version.version}`);
  };

  const toggleOrderType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_order_types: prev.applicable_order_types.includes(type)
        ? prev.applicable_order_types.filter(t => t !== type)
        : [...prev.applicable_order_types, type],
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  };

  // Compare helpers
  const openCompare = () => {
    if (selectedIds.size === 2) {
      const ids = Array.from(selectedIds) as [string, string];
      setCompareIds(ids);
      setShowCompare(true);
    } else {
      showToast('Select exactly 2 templates to compare', 'error');
    }
  };

  const compareTemplateA = templates.find(t => t.id === compareIds[0]);
  const compareTemplateB = templates.find(t => t.id === compareIds[1]);

  const scoredTemplates = templates.filter(t => t.avg_performance_score > 0);
  const avgPerformance = scoredTemplates.length > 0
    ? Math.round(scoredTemplates.reduce((s, t) => s + t.avg_performance_score, 0) / scoredTemplates.length)
    : 0;
  const topSuccessRate = templates.length > 0 ? Math.max(...templates.map(t => t.success_rate)) : 0;
  const totalDeployed = templates.reduce((s, t) => s + t.times_used, 0);

  // Handler: when AI widget selects a template, open deploy modal
  const handleAISuggestSelect = (template: PromoTemplate) => {
    setPreviewTemplate(template);
    showToast(`"${template.name}" selected from AI suggestions`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/template-review-queue" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="ArrowLeft" size={20} />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Icon name="BookmarkSquare" size={16} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">Promo Templates</h1>
                  <p className="text-xs text-gray-500 mt-0.5">Save & reuse campaign configurations</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/template-review-queue"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon name="ClipboardDocumentList" size={15} />
                <span>Review Queue</span>
              </Link>
              <Link
                href="/admin-promo-code-management"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon name="Tag" size={15} />
                <span>Promo Codes</span>
              </Link>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Icon name="Plus" size={16} />
                <span className="hidden sm:inline">Create Template</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Templates', value: templates.length, icon: 'BookmarkSquare', color: 'indigo' },
            { label: 'Times Deployed', value: totalDeployed, icon: 'RocketLaunch', color: 'emerald' },
            { label: 'Avg Performance', value: `${avgPerformance}%`, icon: 'ChartBar', color: 'blue' },
            { label: 'Top Success Rate', value: `${topSuccessRate}%`, icon: 'Trophy', color: 'amber' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={
                  stat.color === 'indigo' ? 'w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center' :
                  stat.color === 'emerald' ? 'w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center' :
                  stat.color === 'blue' ? 'w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center' :
                  'w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center'
                }>
                  <Icon name={stat.icon as any} size={14} className={
                    stat.color === 'indigo' ? 'text-indigo-600' :
                    stat.color === 'emerald' ? 'text-emerald-600' :
                    stat.color === 'blue'? 'text-blue-600' : 'text-amber-600'
                  } />
                </div>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── AI Suggestion Widget ── */}
        <AISuggestionWidget templates={templates} onSelectTemplate={handleAISuggestSelect} />

        {/* Filters & Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Icon name="MagnifyingGlass" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="flat">Flat Amount</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="created_at">Newest First</option>
                <option value="times_used">Most Used</option>
                <option value="avg_performance_score">Best Performance</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="mt-3 flex items-center gap-3 pt-3 border-t border-gray-100 flex-wrap">
              <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
              {selectedIds.size === 2 && (
                <button
                  onClick={openCompare}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Icon name="ArrowsRightLeft" size={14} />
                  Compare Side-by-Side
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Icon name="Trash" size={14} />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Templates Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="BookmarkSquare" size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No templates found</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first template to save reusable promo configurations</p>
            <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              Create Template
            </button>
          </div>
        ) : (
          <>
            {/* Select All + Compare hint */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-500">Select all ({filtered.length})</span>
              </div>
              {selectedIds.size === 2 && (
                <button
                  onClick={openCompare}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Icon name="ArrowsRightLeft" size={14} />
                  Compare Selected
                </button>
              )}
              {selectedIds.size > 0 && selectedIds.size !== 2 && (
                <span className="text-xs text-gray-400">Select 2 templates to compare</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(template => (
                <div
                  key={template.id}
                  className={`bg-white rounded-xl border-2 transition-all ${
                    selectedIds.has(template.id) ? 'border-indigo-400 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(template.id)}
                          onChange={() => toggleSelect(template.id)}
                          className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{template.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        template.category === 'acquisition' ? 'bg-blue-50 text-blue-700' :
                        template.category === 'retention' ? 'bg-purple-50 text-purple-700' :
                        template.category === 'seasonal' ? 'bg-amber-50 text-amber-700' :
                        template.category === 'clearance'? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {template.category}
                      </span>
                    </div>

                    {/* Discount Config */}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                        <Icon name="Tag" size={12} />
                        <span className="text-xs font-bold">
                          {template.discount_type === 'percentage' ? `${template.discount_value}% OFF` : `₦${template.discount_value} OFF`}
                        </span>
                      </div>
                      {template.duration_days && (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                          <Icon name="Clock" size={12} />
                          <span className="text-xs">{template.duration_days}d</span>
                        </div>
                      )}
                      {template.usage_limit && (
                        <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                          <Icon name="Users" size={12} />
                          <span className="text-xs">Cap: {template.usage_limit}</span>
                        </div>
                      )}
                      {/* Version badge */}
                      {versionHistory[template.id] && (
                        <button
                          onClick={() => setHistoryTemplate(template)}
                          className="flex items-center gap-1 bg-violet-50 text-violet-600 px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors"
                          title="View version history"
                        >
                          <Icon name="ClockSolid" size={12} />
                          <span className="text-xs">v{versionHistory[template.id].length}</span>
                        </button>
                      )}
                    </div>

                    {/* Service Types */}
                    <div className="flex gap-1.5 mt-2">
                      {template.applicable_order_types.map(type => (
                        <span key={type} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{type}</span>
                      ))}
                    </div>
                  </div>

                  {/* Metrics */}
                  {template.times_used > 0 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Used</p>
                          <p className="text-sm font-bold text-gray-900">{template.times_used}x</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Score</p>
                          <p className={`text-sm font-bold px-1 rounded ${getPerformanceColor(template.avg_performance_score)}`}>
                            {template.avg_performance_score}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Success</p>
                          <p className="text-sm font-bold text-emerald-600">{template.success_rate}%</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Performance</span>
                          <span className={`font-medium ${getPerformanceColor(template.avg_performance_score).split(' ')[0]}`}>
                            {getPerformanceBadge(template.avg_performance_score)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              template.avg_performance_score >= 90 ? 'bg-emerald-500' :
                              template.avg_performance_score >= 75 ? 'bg-blue-500' :
                              template.avg_performance_score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${template.avg_performance_score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
                    <button
                      onClick={() => handleDeployAsCode(template)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      title="Open Admin Promo creation modal prefilled with this template's settings"
                    >
                      <Icon name="CodeBracket" size={13} />
                      Deploy as Code
                    </button>
                    <button
                      onClick={() => handleDeploy(template)}
                      disabled={deployingId === template.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                      {deployingId === template.id ? (
                        <><Icon name="ArrowPath" size={13} className="animate-spin" /> Deploying...</>
                      ) : (
                        <><Icon name="RocketLaunch" size={13} /> Deploy Campaign</>
                      )}
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Preview"
                    >
                      <Icon name="Eye" size={15} />
                    </button>
                    <button
                      onClick={() => handleClone(template)}
                      className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                      title="Clone template"
                    >
                      <Icon name="DocumentDuplicate" size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(template)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Icon name="PencilSquare" size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(template.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Icon name="Trash" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── REST OF MODALS (preserved from original) ── */}
      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="XMark" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <Icon name="ExclamationCircle" size={16} />
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Weekend Flash Sale"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this template's purpose"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {CATEGORIES.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['percentage', 'flat'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, discount_type: type }))}
                      className={`py-2.5 px-4 rounded-lg text-sm font-medium border-2 transition-colors ${
                        formData.discount_type === type
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {type === 'percentage' ? '% Percentage' : '₦ Flat Amount'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.discount_type === 'percentage' ? 'Discount Percentage (%) *' : 'Flat Discount Amount (₦) *'}
                </label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={e => setFormData(p => ({ ...p, discount_value: e.target.value }))}
                  placeholder={formData.discount_type === 'percentage' ? '0–100' : 'e.g. 500'}
                  min="0"
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₦)</label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={e => setFormData(p => ({ ...p, min_order_amount: e.target.value }))}
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {formData.discount_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₦)</label>
                    <input
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={e => setFormData(p => ({ ...p, max_discount_amount: e.target.value }))}
                      placeholder="No cap"
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Redemption Cap */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Redemption Cap</label>
                <input
                  type="number"
                  value={formData.usage_limit}
                  onChange={e => setFormData(p => ({ ...p, usage_limit: e.target.value }))}
                  placeholder="Unlimited"
                  min="1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validity Duration</label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, duration_preset: preset.value }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        formData.duration_preset === preset.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {formData.duration_preset === -1 && (
                  <div className="mt-2">
                    <input
                      type="number"
                      value={formData.custom_duration}
                      onChange={e => setFormData(p => ({ ...p, custom_duration: e.target.value }))}
                      placeholder="Number of days"
                      min="1"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Service Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Applicable Services *</label>
                <div className="flex gap-2">
                  {['food', 'store'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleOrderType(type)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors capitalize ${
                        formData.applicable_order_types.includes(type)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon name={type === 'food' ? 'ShoppingBag' : 'BuildingStorefront'} size={14} />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingId ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Template Preview</h2>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-600">
                <Icon name="XMark" size={20} />
              </button>
            </div>
            <div className="p-6">
              {/* Preview Card */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-5 text-white mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Tag" size={18} />
                  <span className="text-sm font-medium opacity-90">Special Offer</span>
                </div>
                <div className="text-3xl font-black mb-1">
                  {previewTemplate.discount_type === 'percentage'
                    ? `${previewTemplate.discount_value}% OFF`
                    : `₦${previewTemplate.discount_value} OFF`}
                </div>
                <p className="text-sm opacity-80 mb-3">{previewTemplate.description}</p>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.min_order_amount > 0 && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Min order ₦{previewTemplate.min_order_amount}</span>
                  )}
                  {previewTemplate.duration_days && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Valid {previewTemplate.duration_days} day{previewTemplate.duration_days > 1 ? 's' : ''}</span>
                  )}
                  {previewTemplate.usage_limit && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Limited to {previewTemplate.usage_limit} uses</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Template</span>
                  <span className="font-medium text-gray-900">{previewTemplate.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Applicable to</span>
                  <span className="font-medium text-gray-900 capitalize">{previewTemplate.applicable_order_types.join(', ')}</span>
                </div>
                {previewTemplate.max_discount_amount && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Max discount</span>
                    <span className="font-medium text-gray-900">₦{previewTemplate.max_discount_amount}</span>
                  </div>
                )}
                {previewTemplate.times_used > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Past performance</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${getPerformanceColor(previewTemplate.avg_performance_score)}`}>
                      {getPerformanceBadge(previewTemplate.avg_performance_score)} ({previewTemplate.avg_performance_score})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => { handleDeploy(previewTemplate); setPreviewTemplate(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Icon name="RocketLaunch" size={14} />
                  Deploy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="Trash" size={22} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Template?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This action cannot be undone. All version history will also be removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Version History</h2>
                <p className="text-xs text-gray-500 mt-0.5">{historyTemplate.name}</p>
              </div>
              <button onClick={() => setHistoryTemplate(null)} className="text-gray-400 hover:text-gray-600">
                <Icon name="XMark" size={20} />
              </button>
            </div>
            <div className="p-6">
              {(versionHistory[historyTemplate.id] || []).slice().reverse().map((ver, idx) => (
                <div key={ver.version} className={`relative pl-8 pb-6 last:pb-0 ${idx < (versionHistory[historyTemplate.id] || []).length - 1 ? 'border-l-2 border-gray-200 ml-3' : 'ml-3'}`}>
                  <div className="absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center bg-white border-2 border-gray-300">
                    <span className="text-xs font-bold text-gray-500">{ver.version}</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {ver.label}
                      </span>
                      <span className="text-xs text-gray-400">{ver.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{ver.changeNote}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <div><span className="font-medium">Discount:</span> {ver.snapshot.discount_type === 'percentage' ? `${ver.snapshot.discount_value}%` : `₦${ver.snapshot.discount_value}`}</div>
                      <div><span className="font-medium">Cap:</span> {ver.snapshot.usage_limit ?? 'Unlimited'}</div>
                      <div><span className="font-medium">Duration:</span> {ver.snapshot.duration_days ? `${ver.snapshot.duration_days}d` : '—'}</div>
                    </div>
                    {!ver.label.includes('current') && (
                      <button
                        onClick={() => setRollbackConfirm({ templateId: historyTemplate.id, version: ver })}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <Icon name="ArrowUturnLeft" size={12} />
                        Rollback to this version
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rollback Confirm Modal */}
      {rollbackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="ArrowUturnLeft" size={22} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Rollback to v{rollbackConfirm.version.version}?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This will restore the template to version {rollbackConfirm.version.version} and create a new audit entry. Current changes will be preserved in history.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRollbackConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRollback(rollbackConfirm.templateId, rollbackConfirm.version)}
                className="flex-1 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                Rollback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompare && compareTemplateA && compareTemplateB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Side-by-Side Comparison</h2>
              <button onClick={() => setShowCompare(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="XMark" size={20} />
              </button>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-2 gap-0 border-b border-gray-200">
              <div className="px-4 py-3 border-r border-gray-200 bg-indigo-50">
                <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-0.5">Template A</p>
                <p className="text-sm font-bold text-indigo-800 truncate">{compareTemplateA.name}</p>
              </div>
              <div className="px-4 py-3 bg-violet-50">
                <p className="text-xs text-violet-500 font-medium uppercase tracking-wide mb-0.5">Template B</p>
                <p className="text-sm font-bold text-violet-800 truncate">{compareTemplateB.name}</p>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Amber = different values */}
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                <p className="text-xs text-amber-600"><span className="font-semibold">Highlighted rows</span> indicate differences between templates</p>
              </div>

              <CompareField
                label="Discount"
                a={compareTemplateA.discount_type === 'percentage' ? `${compareTemplateA.discount_value}%` : `₦${compareTemplateA.discount_value}`}
                b={compareTemplateB.discount_type === 'percentage' ? `${compareTemplateB.discount_value}%` : `₦${compareTemplateB.discount_value}`}
              />
              <CompareField label="Type" a={compareTemplateA.discount_type} b={compareTemplateB.discount_type} />
              <CompareField label="Min Order" a={`₦${compareTemplateA.min_order_amount}`} b={`₦${compareTemplateB.min_order_amount}`} />
              <CompareField
                label="Max Discount Cap"
                a={compareTemplateA.max_discount_amount ? `₦${compareTemplateA.max_discount_amount}` : 'No cap'}
                b={compareTemplateB.max_discount_amount ? `₦${compareTemplateB.max_discount_amount}` : 'No cap'}
              />
              <CompareField
                label="Redemption Cap"
                a={compareTemplateA.usage_limit ? String(compareTemplateA.usage_limit) : 'Unlimited'}
                b={compareTemplateB.usage_limit ? String(compareTemplateB.usage_limit) : 'Unlimited'}
              />
              <CompareField label="Duration" a={compareTemplateA.duration_days ? `${compareTemplateA.duration_days} days` : 'No limit'} b={compareTemplateB.duration_days ? `${compareTemplateB.duration_days} days` : 'No limit'} />
              <CompareField label="Category" a={compareTemplateA.category} b={compareTemplateB.category} />
              <CompareField label="Services" a={compareTemplateA.applicable_order_types.join(', ')} b={compareTemplateB.applicable_order_types.join(', ')} />
              <CompareField label="Times Used" a={`${compareTemplateA.times_used}x`} b={`${compareTemplateB.times_used}x`} />
              <CompareField
                label="Performance Score"
                a={compareTemplateA.avg_performance_score > 0 ? `${compareTemplateA.avg_performance_score} (${getPerformanceBadge(compareTemplateA.avg_performance_score)})` : 'N/A'}
                b={compareTemplateB.avg_performance_score > 0 ? `${compareTemplateB.avg_performance_score} (${getPerformanceBadge(compareTemplateB.avg_performance_score)})` : 'N/A'}
              />
              <CompareField
                label="Success Rate"
                a={compareTemplateA.success_rate > 0 ? `${compareTemplateA.success_rate}%` : 'N/A'}
                b={compareTemplateB.success_rate > 0 ? `${compareTemplateB.success_rate}%` : 'N/A'}
              />
              <CompareField label="Created" a={compareTemplateA.created_at} b={compareTemplateB.created_at} />
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowCompare(false)} className="w-full py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <Icon name={toast.type === 'success' ? 'CheckCircle' : 'ExclamationCircle'} size={16} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
