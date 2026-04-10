import { motion } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, UserPlus, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import StatsCard from '../components/StatsCard';
import AttendanceChart from '../components/AttendanceChart';
import DonationsChart from '../components/DonationsChart';
import DemographicsChart from '../components/DemographicsChart';
import EventsSection from '../components/EventsSection';
import UpcomingBirthdays from '../components/UpcomingBirthdays';
import ActivityFeed from '../components/ActivityFeed';
import MinistryGroups from '../components/MinistryGroups';
import { membersApi, attendanceApi, donationsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { CardGridSkeleton, ChartSkeleton } from '../components/LoadingStates';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface DashboardStats {
  totalMembers: number;
  sundayAttendance: number;
  monthlyDonations: number;
  activeVolunteers: number;
  membersChange: number;
  attendanceChange: number;
  donationsChange: number;
  volunteersChange: number;
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    sundayAttendance: 0,
    monthlyDonations: 0,
    activeVolunteers: 0,
    membersChange: 0,
    attendanceChange: 0,
    donationsChange: 0,
    volunteersChange: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const currentMonthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const monthEnd = `${currentMonthKey}-${String(lastDay).padStart(2, '0')}`;

      const prevM = m === 0 ? 11 : m - 1;
      const prevY = m === 0 ? y - 1 : y;
      const prevMonthKey = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;
      const prevLastDay = new Date(prevY, prevM + 1, 0).getDate();
      const prevMonthEnd = `${prevMonthKey}-${String(prevLastDay).padStart(2, '0')}`;

      const [
        membersResponse,
        attendanceResponse,
        donationsResponse,
        monthlyDonationsResponse,
        prevMonthDonationsResponse,
      ] = await Promise.all([
        membersApi.getMemberStats(),
        attendanceApi.getAttendanceStats(),
        donationsApi.getDonationStats(),
        donationsApi.getDonations({
          dateFrom: `${currentMonthKey}-01`,
          dateTo: monthEnd,
          pageSize: 15000,
        }),
        donationsApi.getDonations({
          dateFrom: `${prevMonthKey}-01`,
          dateTo: prevMonthEnd,
          pageSize: 15000,
        }),
      ]);

      if (!membersResponse.success || !membersResponse.data) {
        throw new Error(membersResponse.error || 'Failed to load member stats');
      }
      if (!attendanceResponse.success || !attendanceResponse.data) {
        throw new Error('Failed to load attendance stats');
      }
      if (!donationsResponse.success || !donationsResponse.data) {
        throw new Error('Failed to load donation stats');
      }

      const monthlyTotal =
        monthlyDonationsResponse.success && monthlyDonationsResponse.data
          ? monthlyDonationsResponse.data.reduce(
              (sum: number, donation: { amount: number }) => sum + donation.amount,
              0
            )
          : 0;

      const prevMonthTotal =
        prevMonthDonationsResponse.success && prevMonthDonationsResponse.data
          ? prevMonthDonationsResponse.data.reduce(
              (sum: number, donation: { amount: number }) => sum + donation.amount,
              0
            )
          : 0;

      const mData = membersResponse.data;
      const aData = attendanceResponse.data;

      setStats({
        totalMembers: mData.totalMembers,
        sundayAttendance: aData.averageAttendance,
        monthlyDonations: Math.round(monthlyTotal),
        activeVolunteers: mData.ministryParticipants,
        membersChange: pctChange(mData.newThisMonth, mData.newMembersLastMonth),
        attendanceChange: aData.attendanceRate,
        donationsChange: pctChange(monthlyTotal, prevMonthTotal),
        volunteersChange: 0,
      });
      setLastUpdated(new Date());
    } catch (err) {
      handleError(err, { context: 'Dashboard data fetch', showNotification: false });
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleError]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Polling with proper cleanup
  useEffect(() => {
    intervalRef.current = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchDashboardData]);

  const displayName =
    profile?.name?.trim().split(/\s+/)[0] ||
    user?.user_metadata?.first_name ||
    user?.email?.split('@')[0] ||
    'there';

  if (loading) {
    return (
      <>
        <Header />
        <ErrorBoundary>
          <main className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
            <div className="space-y-3">
              <div className="h-10 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 rounded-2xl w-64 animate-shimmer" />
              <div className="h-5 bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 rounded-xl w-80 animate-shimmer" />
            </div>
            
            <CardGridSkeleton count={4} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="lg:col-span-1">
                <ChartSkeleton />
              </div>
              <div className="lg:col-span-2">
                <ChartSkeleton />
              </div>
            </div>
          </main>
        </ErrorBoundary>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <ErrorBoundary>
          <main className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto mt-20"
            >
              <div className="bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200 rounded-2xl p-8 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-rose-800 mb-2">Unable to load dashboard</h3>
                    <p className="text-rose-600 text-sm mb-6 leading-relaxed">{error}</p>
                    <button
                      type="button"
                      onClick={fetchDashboardData}
                      className="px-6 py-3 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl hover:from-rose-700 hover:to-red-700 transition-all shadow-lg shadow-rose-200 font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </main>
        </ErrorBoundary>
      </>
    );
  }

  return (
    <>
      <Header />
      <ErrorBoundary>
        <main className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl -z-10" />
          
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-serif font-bold text-stone-800 flex items-center gap-2">
                    {getGreeting()}, {displayName}
                  </h1>
                  <p className="text-stone-500 mt-1 font-light flex items-center gap-2">
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    {lastUpdated && (
                      <>
                        <span className="text-stone-300">•</span>
                        <span className="text-xs">
                          Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/members?action=add')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Member</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/events?action=add')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-all shadow-sm font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">New Event</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setRefreshing(true); fetchDashboardData(); }}
                  title="Refresh dashboard"
                  className="p-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-all shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 text-stone-600 ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </div>

            {/* Status Banner */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl text-sm shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="font-semibold text-amber-800">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-stone-600">Here&apos;s your church overview for today</span>
              <div className="ml-auto flex items-center gap-2 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium hidden sm:inline">All systems active</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <StatsCard
              title="Total Members"
              value={stats.totalMembers}
              change={stats.membersChange}
              icon="users"
              color="amber"
            />
            <StatsCard
              title="Sunday Attendance"
              value={stats.sundayAttendance}
              change={stats.attendanceChange}
              icon="heart"
              color="rose"
            />
            <StatsCard
              title="Monthly Donations"
              value={stats.monthlyDonations}
              prefix="GH₵"
              change={stats.donationsChange}
              icon="gift"
              color="emerald"
            />
            <StatsCard
              title="Active Volunteers"
              value={stats.activeVolunteers}
              change={stats.volunteersChange}
              icon="hand-heart"
              color="blue"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-8">
            <AttendanceChart />
            <DonationsChart />
          </div>

          {/* Demographics & Ministry */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
            <div className="lg:col-span-1">
              <DemographicsChart />
            </div>
            <MinistryGroups />
          </div>

          {/* Activity Feed Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <EventsSection />
            <UpcomingBirthdays />
            <ActivityFeed />
          </div>
        </main>
      </ErrorBoundary>
    </>
  );
}
