import { motion } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
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

export default function Dashboard() {
  const { profile, user } = useAuth();
  const { handleError } = useErrorHandler();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
    } catch (err) {
      handleError(err, { context: 'Dashboard data fetch', showNotification: false });
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
          <main className="p-6 lg:p-8 space-y-8">
            <div className="space-y-2">
              <div className="h-8 bg-stone-200 rounded-lg w-48 animate-pulse" />
              <div className="h-4 bg-stone-100 rounded-lg w-64 animate-pulse" />
            </div>
            
            <CardGridSkeleton count={4} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ChartSkeleton />
              </div>
              <div className="lg:col-span-1">
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
          <main className="p-6 lg:p-8">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
              <h3 className="text-rose-800 font-medium mb-2">Unable to load dashboard</h3>
              <p className="text-rose-600 text-sm mb-4">{error}</p>
              <button
                type="button"
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </main>
        </ErrorBoundary>
      </>
    );
  }

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
            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-stone-800">
              Welcome back, {displayName}
            </h1>
            <p className="text-stone-600 mt-2 font-light">
              Here&apos;s what&apos;s happening at your church today.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <AttendanceChart />
            <DonationsChart />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <DemographicsChart />
            <MinistryGroups />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <EventsSection />
            <UpcomingBirthdays />
            <ActivityFeed />
          </div>
        </main>
      </ErrorBoundary>
    </>
  );
}
