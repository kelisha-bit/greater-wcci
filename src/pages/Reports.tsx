import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FileText,
  Church,
  Heart,
  Loader2,
  Calendar,
  Repeat,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Receipt,
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  membersApi,
  attendanceApi,
  donationsApi,
  ministriesApi,
  reportsApi,
  eventsApi,
  expensesApi,
  type Donation,
  type Report,
} from '../services/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

type DateRangeKey = 'month' | 'quarter' | 'year';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function endOfMonthDateString(year: number, monthIndex: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return `${year}-${pad2(monthIndex + 1)}-${String(last).padStart(2, '0')}`;
}

function getReportingPeriod(range: DateRangeKey, ref = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth();

  if (range === 'month') {
    const from = `${y}-${pad2(m + 1)}-01`;
    const to = endOfMonthDateString(y, m);
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    const prevFrom = `${py}-${pad2(pm + 1)}-01`;
    const prevTo = endOfMonthDateString(py, pm);
    return { current: { from, to }, previous: { from: prevFrom, to: prevTo } };
  }

  if (range === 'quarter') {
    const q = Math.floor(m / 3);
    const startM = q * 3;
    const endM = startM + 2;
    const from = `${y}-${pad2(startM + 1)}-01`;
    const to = endOfMonthDateString(y, endM);
    let pq = q - 1;
    let py = y;
    if (pq < 0) {
      pq = 3;
      py -= 1;
    }
    const pStartM = pq * 3;
    const pEndM = pStartM + 2;
    const prevFrom = `${py}-${pad2(pStartM + 1)}-01`;
    const prevTo = endOfMonthDateString(py, pEndM);
    return { current: { from, to }, previous: { from: prevFrom, to: prevTo } };
  }

  const from = `${y}-01-01`;
  const to = `${y}-12-31`;
  const prevFrom = `${y - 1}-01-01`;
  const prevTo = `${y - 1}-12-31`;
  return { current: { from, to }, previous: { from: prevFrom, to: prevTo } };
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatCompactCurrency(n: number): string {
  const v = Math.round(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

function sumDonations(rows: Donation[] | undefined): number {
  if (!rows?.length) return 0;
  return rows.reduce((s, d) => s + Number(d.amount), 0);
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function buildGivingChartData(
  donations: Donation[] | undefined,
  range: DateRangeKey,
  ref = new Date()
): { name: string; amount: number }[] {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const rows = donations ?? [];

  if (range === 'month') {
    const total = sumDonations(rows);
    return [{ name: MONTH_NAMES[m], amount: total }];
  }

  if (range === 'quarter') {
    const qStart = Math.floor(m / 3) * 3;
    const buckets = [0, 0, 0];
    for (const d of rows) {
      const dt = new Date(d.date);
      if (Number.isNaN(dt.getTime()) || dt.getFullYear() !== y) continue;
      const mi = dt.getMonth();
      if (mi < qStart || mi >= qStart + 3) continue;
      buckets[mi - qStart] += Number(d.amount);
    }
    return [0, 1, 2].map((i) => ({
      name: MONTH_NAMES[qStart + i],
      amount: buckets[i],
    }));
  }

  const totals = Array(12).fill(0) as number[];
  for (const d of rows) {
    const dt = new Date(d.date);
    if (Number.isNaN(dt.getTime()) || dt.getFullYear() !== y) continue;
    totals[dt.getMonth()] += Number(d.amount);
  }
  return MONTH_NAMES.map((name, i) => ({ name, amount: totals[i] }));
}

function sliceAttendanceTrend(
  full: { name: string; attendance: number; visitors: number }[],
  range: DateRangeKey,
  ref = new Date()
) {
  const m = ref.getMonth();
  if (range === 'year') return full;
  if (range === 'month') return full.filter((_, i) => i === m);
  const qStart = Math.floor(m / 3) * 3;
  return full.filter((_, i) => i >= qStart && i < qStart + 3);
}

function iconForReportType(type: string) {
  switch (type) {
    case 'donations':
      return DollarSign;
    case 'membership':
      return Users;
    case 'attendance':
      return Church;
    case 'ministry':
      return Heart;
    default:
      return FileText;
  }
}

// Fund type colors for charts
const FUND_COLORS: Record<string, string> = {
  'General Fund': '#10b981',
  'Building Fund': '#3b82f6',
  'Missions': '#f59e0b',
  'Youth Ministry': '#8b5cf6',
  "Children's Ministry": '#ec4899',
  'Benevolence': '#ef4444',
  'Music Ministry': '#06b6d4',
  'Other': '#78716c',
};

function processFinanceBreakdown(
  donations: Donation[],
  total: number,
  setFund: (v: { name: string; amount: number; color: string }[]) => void,
  setPayment: (v: { name: string; amount: number; count: number }[]) => void,
  setRecurring: (v: { total: number; count: number; percentage: number }) => void,
  setAvg: (v: number) => void,
  setCount: (v: number) => void,
  setTopDonors: (v: { name: string; amount: number; count: number }[]) => void
) {
  // Fund breakdown
  const fundMap = new Map<string, number>();
  for (const d of donations) {
    const fund = d.fundType || 'General Fund';
    fundMap.set(fund, (fundMap.get(fund) || 0) + Number(d.amount));
  }
  const fundData = Array.from(fundMap.entries())
    .map(([name, amount]) => ({
      name,
      amount,
      color: FUND_COLORS[name] || '#78716c',
    }))
    .sort((a, b) => b.amount - a.amount);
  setFund(fundData);

  // Payment method breakdown
  const paymentMap = new Map<string, { amount: number; count: number }>();
  for (const d of donations) {
    const method = d.paymentMethod || 'Other';
    const existing = paymentMap.get(method) || { amount: 0, count: 0 };
    paymentMap.set(method, {
      amount: existing.amount + Number(d.amount),
      count: existing.count + 1,
    });
  }
  const paymentData = Array.from(paymentMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount);
  setPayment(paymentData);

  // Recurring donations
  const recurringDonations = donations.filter((d) => d.isRecurring);
  const recurringTotal = recurringDonations.reduce((s, d) => s + Number(d.amount), 0);
  setRecurring({
    total: recurringTotal,
    count: recurringDonations.length,
    percentage: total > 0 ? Math.round((recurringTotal / total) * 100) : 0,
  });

  // Average donation and count
  const count = donations.length;
  const avg = count > 0 ? Math.round(total / count) : 0;
  setAvg(avg);
  setCount(count);

  // Top donors
  const donorMap = new Map<string, { amount: number; count: number }>();
  for (const d of donations) {
    const key = d.donorName || d.donorEmail || 'Anonymous';
    const existing = donorMap.get(key) || { amount: 0, count: 0 };
    donorMap.set(key, {
      amount: existing.amount + Number(d.amount),
      count: existing.count + 1,
    });
  }
  const topDonorsList = Array.from(donorMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  setTopDonors(topDonorsList);
}

function processEventsStats(
  events: { event_date?: string; status?: string }[],
  currFrom: string,
  currTo: string,
  prevFrom: string,
  prevTo: string,
  setCount: (v: number) => void,
  setPrevCount: (v: number) => void,
  setCompleted: (v: number) => void
) {
  const curr = events.filter((e) => {
    const d = e.event_date;
    return d && d >= currFrom && d <= currTo;
  });
  const prev = events.filter((e) => {
    const d = e.event_date;
    return d && d >= prevFrom && d <= prevTo;
  });
  const completed = events.filter((e) => e.status === 'completed');
  setCount(curr.length);
  setPrevCount(prev.length);
  setCompleted(completed.length);
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRangeKey>('year');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalMembers, setTotalMembers] = useState(0);
  const [newMembersCurr, setNewMembersCurr] = useState(0);
  const [newMembersPrev, setNewMembersPrev] = useState(0);
  const [presentCurr, setPresentCurr] = useState(0);
  const [presentPrev, setPresentPrev] = useState(0);
  const [givingTotal, setGivingTotal] = useState(0);
  const [givingPrev, setGivingPrev] = useState(0);
  const [ministryLinks, setMinistryLinks] = useState(0);

  // New finance metrics
  const [fundBreakdown, setFundBreakdown] = useState<{ name: string; amount: number; color: string }[]>([]);
  const [paymentMethodBreakdown, setPaymentMethodBreakdown] = useState<{ name: string; amount: number; count: number }[]>([]);
  const [recurringStats, setRecurringStats] = useState<{ total: number; count: number; percentage: number }>({ total: 0, count: 0, percentage: 0 });
  const [avgDonation, setAvgDonation] = useState(0);
  const [donationCount, setDonationCount] = useState(0);
  const [topDonors, setTopDonors] = useState<{ name: string; amount: number; count: number }[]>([]);

  // Event metrics
  const [eventsCount, setEventsCount] = useState(0);
  const [eventsPrevCount, setEventsPrevCount] = useState(0);
  const [completedEvents, setCompletedEvents] = useState(0);

  // Expense metrics
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expenseApproved, setExpenseApproved] = useState(0);
  const [expensePending, setExpensePending] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [, setExpenseCategoryTotals] = useState<Record<string, number>>({});

  // Member status breakdown
  const [memberStatusBreakdown, setMemberStatusBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);


  const [attendanceTrend, setAttendanceTrend] = useState<
    { name: string; attendance: number; visitors: number }[]
  >([]);
  const [givingChart, setGivingChart] = useState<{ name: string; amount: number }[]>([]);
  const [demographicsData, setDemographicsData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [ministryInvolvement, setMinistryInvolvement] = useState<
    { name: string; members: number }[]
  >([]);
  const [savedReports, setSavedReports] = useState<Report[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const year = new Date().getFullYear();
    const { current, previous } = getReportingPeriod(dateRange);

    try {
      const [
        memberStatsRes,
        joinedCurrRes,
        joinedPrevRes,
        presentCurrRes,
        presentPrevRes,
        donationsCurrRes,
        donationsPrevRes,
        trendRes,
        demoRes,
        minRes,
        reportsRes,
        eventsRes,
      ] = await Promise.all([
        membersApi.getMemberStats(),
        membersApi.countJoinedBetween(current.from, current.to),
        membersApi.countJoinedBetween(previous.from, previous.to),
        attendanceApi.countPresentBetween(current.from, current.to),
        attendanceApi.countPresentBetween(previous.from, previous.to),
        donationsApi.getDonations({
          dateFrom: current.from,
          dateTo: current.to,
          pageSize: 15000,
        }),
        donationsApi.getDonations({
          dateFrom: previous.from,
          dateTo: previous.to,
          pageSize: 15000,
        }),
        attendanceApi.getMonthlyAttendanceTrend(year),
        membersApi.getAgeDemographics(),
        ministriesApi.listWithMemberCounts(),
        reportsApi.getReports({ limit: 12 }),
        eventsApi.getEvents({ limit: 1000 }),
      ]);

      if (!memberStatsRes.success || memberStatsRes.data == null) {
        throw new Error(memberStatsRes.error || 'Failed to load member statistics');
      }

      setTotalMembers(memberStatsRes.data.totalMembers);
      setMinistryLinks(memberStatsRes.data.ministryParticipants);
      setNewMembersCurr(joinedCurrRes.data ?? 0);
      setNewMembersPrev(joinedPrevRes.data ?? 0);
      setPresentCurr(presentCurrRes.data ?? 0);
      setPresentPrev(presentPrevRes.data ?? 0);

      const currTotal = sumDonations(donationsCurrRes.data);
      const prevTotal = sumDonations(donationsPrevRes.data);
      setGivingTotal(currTotal);
      setGivingPrev(prevTotal);

      // Process finance breakdown from current donations
      const currDonations = donationsCurrRes.data ?? [];
      processFinanceBreakdown(
        currDonations,
        currTotal,
        setFundBreakdown,
        setPaymentMethodBreakdown,
        setRecurringStats,
        setAvgDonation,
        setDonationCount,
        setTopDonors
      );

      // Process events stats
      processEventsStats(
        eventsRes.data ?? [],
        current.from,
        current.to,
        previous.from,
        previous.to,
        setEventsCount,
        setEventsPrevCount,
        setCompletedEvents
      );

      // Fetch expense stats
      try {
        const expenseStatsRes = await expensesApi.getExpenseStats({
          dateFrom: current.from,
          dateTo: current.to,
        });
        if (expenseStatsRes.success && expenseStatsRes.data) {
          setExpenseTotal(expenseStatsRes.data.totalExpenses);
          setExpenseApproved(expenseStatsRes.data.approvedExpenses);
          setExpensePending(expenseStatsRes.data.pendingExpenses);
          setExpenseCount(expenseStatsRes.data.expenseCount);
          setExpenseCategoryTotals(expenseStatsRes.data.categoryTotals);
        }
      } catch (expenseErr) {
        console.warn('Failed to fetch expense stats:', expenseErr);
      }

      // Member status breakdown
      setMemberStatusBreakdown([
        { name: 'Active', value: memberStatsRes.data.activeMembers, color: '#10b981' },
        { name: 'Visitors', value: memberStatsRes.data.visitorCount, color: '#f59e0b' },
        { name: 'New This Month', value: memberStatsRes.data.newThisMonth, color: '#3b82f6' },
        { name: 'Inactive', value: Math.max(0, memberStatsRes.data.totalMembers - memberStatsRes.data.activeMembers - memberStatsRes.data.visitorCount), color: '#ef4444' },
      ]);

      const trend =
        trendRes.success && trendRes.data?.length
          ? trendRes.data
          : MONTH_NAMES.map((name) => ({ name, attendance: 0, visitors: 0 }));
      setAttendanceTrend(sliceAttendanceTrend(trend, dateRange));

      setGivingChart(buildGivingChartData(donationsCurrRes.data, dateRange));

      if (demoRes.success && demoRes.data) {
        setDemographicsData(demoRes.data);
      } else {
        setDemographicsData([]);
      }

      if (minRes.success && minRes.data?.length) {
        const sorted = [...minRes.data].sort((a, b) => b.memberCount - a.memberCount);
        setMinistryInvolvement(
          sorted.slice(0, 8).map((x) => ({ name: x.name, members: x.memberCount }))
        );
      } else {
        setMinistryInvolvement([]);
      }

      if (reportsRes.success && reportsRes.data) {
        setSavedReports(reportsRes.data);
      } else {
        setSavedReports([]);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const memberGrowthPct = useMemo(
    () => pctChange(newMembersCurr, newMembersPrev),
    [newMembersCurr, newMembersPrev]
  );
  const attendancePct = useMemo(
    () => pctChange(presentCurr, presentPrev),
    [presentCurr, presentPrev]
  );
  const givingPct = useMemo(() => pctChange(givingTotal, givingPrev), [givingTotal, givingPrev]);

  const trendMax = useMemo(
    () => Math.max(...attendanceTrend.flatMap((d) => [d.attendance, d.visitors]), 1),
    [attendanceTrend]
  );

  const handleExportCsv = useCallback(() => {
    const rows: string[][] = [
      ['ChurchApp report summary'],
      ['Period', dateRange],
      ['Total members', String(totalMembers)],
      ['New members (period)', String(newMembersCurr)],
      ['Present check-ins (period)', String(presentCurr)],
      ['Giving total (period)', String(Math.round(givingTotal))],
      ['Ministry participant links', String(ministryLinks)],
    ];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `church-report-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dateRange, totalMembers, newMembersCurr, presentCurr, givingTotal, ministryLinks]);

  const rangeLabel =
    dateRange === 'month'
      ? 'this month'
      : dateRange === 'quarter'
        ? 'this quarter'
        : 'this year';

  const TrendSub = ({ value }: { value: number }) =>
    value === 0 ? (
      <p className="text-xs text-stone-500 mt-1">No change vs prior period</p>
    ) : value > 0 ? (
      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
        <TrendingUp className="w-3 h-3" /> +{value}% vs prior period
      </p>
    ) : (
      <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
        <TrendingDown className="w-3 h-3" /> {value}% vs prior period
      </p>
    );

  return (
    <>
      <Header />
      <ErrorBoundary>
        <main className="p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-stone-800">Reports & Analytics</h1>
                <p className="text-stone-600 mt-1">Live data from your church database</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRangeKey)}
                  disabled={loading}
                  className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
                >
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export summary
                </button>
              </div>
            </div>
          </motion.div>

          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-rose-700">{error}</p>
              <button
                type="button"
                onClick={() => loadData()}
                className="text-sm font-medium text-rose-800 underline"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-stone-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <p className="text-sm">Loading report data…</p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Total members</p>
                      <p className="text-2xl font-bold text-stone-800">
                        {totalMembers.toLocaleString()}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        New joins {rangeLabel}: {newMembersCurr.toLocaleString()}
                      </p>
                      <TrendSub value={memberGrowthPct} />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Present check-ins</p>
                      <p className="text-2xl font-bold text-stone-800">
                        {presentCurr.toLocaleString()}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">In selected period</p>
                      <TrendSub value={attendancePct} />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                      <Church className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Giving ({rangeLabel})</p>
                      <p className="text-2xl font-bold text-stone-800">
                        {formatCompactCurrency(givingTotal)}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">Recorded donations</p>
                      <TrendSub value={givingPct} />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Ministry links</p>
                      <p className="text-2xl font-bold text-stone-800">
                        {ministryLinks.toLocaleString()}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        Member–ministry connections (all time)
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                >
                  <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">
                    Attendance trend
                  </h3>
                  <p className="text-sm text-stone-500 mb-4">
                    Present vs late by month ({new Date().getFullYear()}
                    {dateRange !== 'year' ? ` · ${rangeLabel} highlighted` : ''})
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={attendanceTrend}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#78716c', fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#78716c', fontSize: 12 }}
                          tickFormatter={(v) =>
                            trendMax >= 1000
                              ? `${Math.round(v / 1000)}k`
                              : String(Math.round(v))
                          }
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
                                  <p className="font-semibold text-stone-800 mb-2">{label}</p>
                                  <p className="text-sm text-amber-600">
                                    Present: {payload[0].value?.toLocaleString()}
                                  </p>
                                  <p className="text-sm text-emerald-600">
                                    Late: {payload[1]?.value?.toLocaleString()}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="attendance"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          fill="#f59e0b"
                          fillOpacity={0.22}
                        />
                        <Area
                          type="monotone"
                          dataKey="visitors"
                          stroke="#10b981"
                          strokeWidth={3}
                          fill="#10b981"
                          fillOpacity={0.22}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                >
                  <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">
                    Giving by month
                  </h3>
                  <p className="text-sm text-stone-500 mb-4">Donations in the selected period</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={givingChart}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#78716c', fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#78716c', fontSize: 12 }}
                          tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
                                  <p className="font-semibold text-stone-800 mb-2">{label}</p>
                                  <p className="text-sm text-emerald-600">
                                    ${Number(payload[0].value).toLocaleString()}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="Amount" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                >
                  <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">Demographics</h3>
                  <p className="text-sm text-stone-500 mb-4">
                    Age bands (members with date of birth)
                  </p>
                  <div className="h-48">
                    {demographicsData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                        No demographic data yet
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={demographicsData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {demographicsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                        </RechartsPie>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="space-y-2 mt-4 max-h-40 overflow-y-auto">
                    {demographicsData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-stone-600 truncate">{item.name}</span>
                        </div>
                        <span className="font-medium text-stone-800 shrink-0">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                >
                  <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">
                    Ministry involvement
                  </h3>
                  <p className="text-sm text-stone-500 mb-4">Members per ministry (top 8)</p>
                  <div className="h-64">
                    {ministryInvolvement.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-stone-400 text-sm text-center px-4">
                        No ministries yet. Add ministries and link members in the database.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={ministryInvolvement}
                          layout="vertical"
                          margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#78716c', fontSize: 12 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#78716c', fontSize: 11 }}
                            width={72}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
                                    <p className="text-sm text-stone-700">
                                      {payload[0].value} members
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="members" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                >
                  <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">
                    Saved reports
                  </h3>
                  <p className="text-sm text-stone-500 mb-4">Rows from the reports table</p>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {savedReports.length === 0 ? (
                      <p className="text-sm text-stone-500 py-4">
                        No saved reports yet. They will appear here when added to the database.
                      </p>
                    ) : (
                      savedReports.map((report) => {
                        const Icon = iconForReportType(report.type);
                        return (
                          <div
                            key={String(report.id)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 hover:bg-amber-50 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-stone-800 text-sm truncate">
                                {report.name}
                              </p>
                              <p className="text-xs text-stone-500">
                                {report.type}
                                {report.period ? ` · ${report.period}` : ''} ·{' '}
                                {new Date(report.generatedDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            {report.data && Object.keys(report.data).length > 0 ? (
                              <button
                                type="button"
                                title="Download JSON payload"
                                className="p-2 rounded-lg hover:bg-stone-200 transition-colors shrink-0"
                                onClick={() => {
                                  const blob = new Blob([JSON.stringify(report.data, null, 2)], {
                                    type: 'application/json',
                                  });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `report-${report.id}-data.json`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                <Download className="w-4 h-4 text-stone-500" />
                              </button>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Finance Section */}
              <div className="mb-6">
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-4 flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-emerald-600" />
                  Finance Breakdown
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Total Donations</p>
                        <p className="text-xl font-bold text-stone-800">{donationCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Average Donation</p>
                        <p className="text-xl font-bold text-stone-800">${avgDonation.toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Repeat className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Recurring</p>
                        <p className="text-xl font-bold text-stone-800">${formatCompactCurrency(recurringStats.total)}</p>
                        <p className="text-xs text-stone-500">{recurringStats.percentage}% of total</p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Total Expenses</p>
                        <p className="text-xl font-bold text-stone-800">{formatCompactCurrency(expenseTotal)}</p>
                        <p className="text-xs text-stone-500">{expenseCount} transactions</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Approved Expenses</p>
                        <p className="text-xl font-bold text-emerald-600">{formatCompactCurrency(expenseApproved)}</p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Pending Approval</p>
                        <p className="text-xl font-bold text-amber-600">{formatCompactCurrency(expensePending)}</p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">Net Income</p>
                        <p className={`text-xl font-bold ${givingTotal - expenseTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCompactCurrency(givingTotal - expenseTotal)}</p>
                        <p className="text-xs text-stone-500">Donations - Expenses</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Fund & Payment Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Fund Breakdown Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                  >
                    <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">Fund Distribution</h3>
                    <p className="text-sm text-stone-500 mb-4">Donations by fund type</p>
                    {fundBreakdown.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
                        No fund data available
                      </div>
                    ) : (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie
                              data={fundBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="amount"
                            >
                              {fundBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => `$${Number(value).toLocaleString()}`}
                            />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="space-y-2 mt-4">
                      {fundBreakdown.slice(0, 5).map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-stone-600 truncate">{item.name}</span>
                          </div>
                          <span className="font-medium text-stone-800 shrink-0">
                            ${item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Payment Methods */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                  >
                    <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">Payment Methods</h3>
                    <p className="text-sm text-stone-500 mb-4">Donations by payment type</p>
                    {paymentMethodBreakdown.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
                        No payment method data available
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={paymentMethodBreakdown}
                            layout="vertical"
                            margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                            <XAxis
                              type="number"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#78716c', fontSize: 12 }}
                              tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#78716c', fontSize: 11 }}
                              width={80}
                            />
                            <Tooltip
                              formatter={(value) => `$${Number(value).toLocaleString()}`}
                            />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </motion.div>
                </div>

              {/* Events & Member Status Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Events Statistics */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                >
                  <h3 className="text-lg font-serif font-bold text-stone-800 mb-1 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Events Summary
                  </h3>
                  <p className="text-sm text-stone-500 mb-4">Events in selected period</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs text-stone-500">Events This Period</p>
                        <p className="text-2xl font-bold text-stone-800">{eventsCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-500">vs Previous</p>
                        <p className={`text-sm font-medium flex items-center gap-1 ${eventsCount >= eventsPrevCount ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {eventsCount >= eventsPrevCount ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {eventsPrevCount > 0 ? Math.round(((eventsCount - eventsPrevCount) / eventsPrevCount) * 100) : eventsCount > 0 ? 100 : 0}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <div>
                        <p className="text-xs text-stone-500">Completed Events</p>
                        <p className="text-2xl font-bold text-stone-800">{completedEvents}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center">
                        <Church className="w-5 h-5 text-emerald-700" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div>
                        <p className="text-xs text-stone-500">Previous Period</p>
                        <p className="text-xl font-bold text-stone-800">{eventsPrevCount}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-amber-700" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Member Status Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                >
                  <h3 className="text-lg font-serif font-bold text-stone-800 mb-1">Member Status</h3>
                  <p className="text-sm text-stone-500 mb-4">Current membership breakdown</p>
                  {memberStatusBreakdown.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
                      No member status data
                    </div>
                  ) : (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={memberStatusBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {memberStatusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="space-y-2 mt-4">
                    {memberStatusBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-stone-600 truncate">{item.name}</span>
                        </div>
                        <span className="font-medium text-stone-800 shrink-0">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Top Donors */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
                >
                  <h3 className="text-lg font-serif font-bold text-stone-800 mb-1 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-600" />
                    Top Donors
                  </h3>
                  <p className="text-sm text-stone-500 mb-4">By total giving ({rangeLabel})</p>
                  {topDonors.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-stone-400 text-sm text-center px-4">
                      No donation data yet. Top donors will appear here when donations are recorded.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topDonors.map((donor, index) => (
                        <div
                          key={donor.name}
                          className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 hover:bg-amber-50 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-amber-100 text-amber-700' :
                            index === 1 ? 'bg-stone-200 text-stone-600' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-stone-100 text-stone-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-800 text-sm truncate">{donor.name}</p>
                            <p className="text-xs text-stone-500">{donor.count} donations</p>
                          </div>
                          <p className="font-bold text-emerald-600 text-sm">
                            ${donor.amount.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </main>
      </ErrorBoundary>
    </>
  );
}
