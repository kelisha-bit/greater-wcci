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
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  membersApi,
  attendanceApi,
  donationsApi,
  ministriesApi,
  reportsApi,
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
            </>
          )}
        </main>
      </ErrorBoundary>
    </>
  );
}
