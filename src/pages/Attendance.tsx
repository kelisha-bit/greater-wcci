import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ChevronDown,
  UserCheck,
  Loader2,
  LayoutGrid,
  List,
  Filter,
  Users,
  BarChart3,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Activity,
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import EmptyState from '../components/EmptyState';
import { getLocalToday, getLocalNowISO, formatDate } from '../utils/helpers';
import { getAttendanceStatusConfig } from '../constants/statusConfig';
import {
  useMembers,
  useAttendance,
  useRecordAttendance,
  useUpdateAttendance,
  useAttendanceStats,
  useEvents,
} from '../hooks/useData';
import { useNotification } from '../hooks/useNotification';
import { attendanceApi } from '../services/api';
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

const BULK_CHUNK_SIZE = 12;

const emptyMonthTrend = () =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
    (name) => ({ name, present: 0, late: 0 })
  );

const PIE_COLORS = ['#10b981', '#f59e0b', '#f43f5e'];

export default function Attendance() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState<string>(searchParams.get('eventId') || '');
  const [selectedDate, setSelectedDate] = useState<string>(getLocalToday());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const ITEMS_PER_PAGE = 12;
  const { show: showToast } = useNotification();

  // Update selectedEventId if query param changes
  const { data: members, isLoading: membersLoading } = useMembers(1, 1000);
  const { data: events, isLoading: eventsLoading } = useEvents({ status: 'published' });

  useEffect(() => {
    if (events && events.length > 0 && !selectedEventId) {
      setSelectedEventId(String(events[0].id));
    }
  }, [events, selectedEventId]);

  const attendanceFilters = useMemo(
    () => ({ eventId: selectedEventId, date: selectedDate }),
    [selectedEventId, selectedDate]
  );

  const {
    data: attendanceRecords,
    isLoading: attendanceLoading,
    refetch: refetchAttendance,
    error: attendanceListError,
  } = useAttendance(attendanceFilters, Boolean(selectedEventId));

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useAttendanceStats();

  const [monthlyTrend, setMonthlyTrend] = useState<
    { name: string; present: number; late: number }[]
  >(() => emptyMonthTrend());
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const year = new Date().getFullYear();
    (async () => {
      try {
        setTrendLoading(true);
        const res = await attendanceApi.getMonthlyAttendanceTrend(year);
        if (cancelled) return;
        if (res.success && res.data?.length) {
          setMonthlyTrend(
            res.data.map((row) => ({
              name: row.name,
              present: row.attendance,
              late: row.visitors,
            }))
          );
        } else {
          setMonthlyTrend(emptyMonthTrend());
        }
      } catch {
        if (!cancelled) setMonthlyTrend(emptyMonthTrend());
      } finally {
        if (!cancelled) setTrendLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  
  const { record: recordAttendance, isLoading: recordingAttendance } = useRecordAttendance();
  const { update: updateAttendance, isLoading: updatingAttendance } = useUpdateAttendance();

  // Process data
  const processedAttendance = useMemo(() => {
    if (!members) return [];

    return members.map((member) => {
      const record = attendanceRecords?.find(
        (r) => String(r.memberId) === String(member.id)
      );
      return {
        id: member.id,
        name: member.name,
        avatar: member.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        profileImageUrl: (member as { profileImageUrl?: string }).profileImageUrl,
        status: record?.status || 'absent',
        checkIn: record?.date
          ? new Date(record.date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : null,
        family: (member as { family?: string }).family || 'Member',
        recordId: record?.id,
      };
    });
  }, [members, attendanceRecords]);

  const filteredMembers = useMemo(() => {
    let result = processedAttendance.filter((member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter);
    }
    
    return result;
  }, [processedAttendance, searchQuery, statusFilter]);

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedEventId]);

  const trendMax = useMemo(
    () => Math.max(...monthlyTrend.flatMap((d) => [d.present, d.late]), 1),
    [monthlyTrend]
  );

  const presentCount = processedAttendance.filter(m => m.status === 'present').length;
  const absentCount = processedAttendance.filter(m => m.status === 'absent').length;
  const lateCount = processedAttendance.filter(m => m.status === 'late').length;
  const attendancePercentage = processedAttendance.length > 0 
    ? Math.round((presentCount / processedAttendance.length) * 100) 
    : 0;

  // Pie chart data for attendance distribution
  const pieData = useMemo(() => [
    { name: 'Present', value: presentCount, color: PIE_COLORS[0] },
    { name: 'Late', value: lateCount, color: PIE_COLORS[1] },
    { name: 'Absent', value: absentCount, color: PIE_COLORS[2] },
  ], [presentCount, lateCount, absentCount]);

  // Toggle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  // Select all visible members
  const toggleSelectAll = () => {
    if (selectedMembers.size === paginatedMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(paginatedMembers.map(m => m.id)));
    }
  };

  const handleMarkPresent = async (memberId: string, currentRecordId?: string) => {
    if (!selectedEventId) {
      showToast('error', 'No Event Selected', 'Please select an event to record attendance');
      return;
    }

    const now = getLocalNowISO();
    let success = false;

    try {
      if (currentRecordId) {
        const res = await updateAttendance(currentRecordId, { status: 'present', date: now });
        success = !!res;
      } else {
        const member = members?.find(m => m.id === memberId);
        const res = await recordAttendance({
          memberId: memberId,
          memberName: member?.name || 'Unknown',
          status: 'present',
          date: now,
          eventId: selectedEventId
        });
        success = !!res;
      }

      if (success) {
        showToast('success', 'Attendance Updated', 'Member marked as present');
        refetchAttendance?.();
      } else {
        showToast('error', 'Update Failed', 'Could not update attendance. Please try again.');
      }
    } catch (error) {
      console.error('Error marking member as present:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (errorMessage.includes('409') || errorMessage.includes('conflict')) {
        showToast('error', 'Conflict Detected', 'This attendance record already exists. The data has been updated automatically.');
        refetchAttendance?.();
      } else {
        showToast('error', 'Error', 'An unexpected error occurred while updating attendance');
      }
    }
  };

  const handleMarkAbsent = async (_memberId: string, currentRecordId?: string) => {
    if (!currentRecordId) {
      showToast('info', 'No Record Found', 'Member has no attendance record for this event');
      return;
    }

    try {
      const res = await updateAttendance(currentRecordId, { status: 'absent' });
      if (res) {
        showToast('success', 'Attendance Updated', 'Member marked as absent');
        refetchAttendance?.();
      } else {
        showToast('error', 'Update Failed', 'Could not update attendance. Please try again.');
      }
    } catch (error) {
      console.error('Error marking member as absent:', error);
      showToast('error', 'Error', 'An unexpected error occurred while updating attendance');
    }
  };

  const handleMarkLate = async (memberId: string, currentRecordId?: string) => {
    if (!selectedEventId) {
      showToast('error', 'No Event Selected', 'Please select an event to record attendance');
      return;
    }

    const now = getLocalNowISO();
    let success = false;

    try {
      if (currentRecordId) {
        const res = await updateAttendance(currentRecordId, { status: 'late', date: now });
        success = !!res;
      } else {
        const member = members?.find(m => m.id === memberId);
        const res = await recordAttendance({
          memberId: memberId,
          memberName: member?.name || 'Unknown',
          status: 'late',
          date: now,
          eventId: selectedEventId
        });
        success = !!res;
      }

      if (success) {
        showToast('success', 'Attendance Updated', 'Member marked as late');
        refetchAttendance?.();
      } else {
        showToast('error', 'Update Failed', 'Could not update attendance. Please try again.');
      }
    } catch (error) {
      console.error('Error marking member as late:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (errorMessage.includes('409') || errorMessage.includes('conflict')) {
        showToast('error', 'Conflict Detected', 'This attendance record already exists. The data has been updated automatically.');
        refetchAttendance?.();
      } else {
        showToast('error', 'Error', 'An unexpected error occurred while updating attendance');
      }
    }
  };

  const handleBulkMarkPresent = async () => {
    if (!selectedEventId) {
      showToast('error', 'No Event Selected', 'Please select an event to record attendance');
      return;
    }

    const now = getLocalNowISO();
    const absentMembers = filteredMembers.filter(m => m.status === 'absent' || m.status === 'late');
    
    if (absentMembers.length === 0) {
      showToast('info', 'All Present', 'All members are already marked as present');
      return;
    }

    setBulkLoading(true);
    try {
      let successCount = 0;
      let conflictCount = 0;
      
      for (let i = 0; i < absentMembers.length; i += BULK_CHUNK_SIZE) {
        const chunk = absentMembers.slice(i, i + BULK_CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map(async (member) => {
            try {
              if (member.recordId) {
                const res = await updateAttendance(member.recordId, {
                  status: 'present',
                  date: now,
                });
                return !!res;
              }
              const res = await recordAttendance({
                memberId: member.id,
                memberName: member.name,
                status: 'present',
                date: now,
                eventId: selectedEventId,
              });
              return !!res;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : '';
              if (errorMessage.includes('409') || errorMessage.includes('conflict')) {
                conflictCount++;
                return true; // Conflict means record exists and was updated
              }
              return false;
            }
          })
        );
        successCount += results.filter(Boolean).length;
      }

      if (successCount > 0) {
        const message = conflictCount > 0 
          ? `Marked ${successCount} members as present (${conflictCount} conflicts resolved)`
          : `Marked ${successCount} members as present`;
        showToast('success', 'Bulk Update Complete', message);
        refetchAttendance?.();
      } else {
        showToast('error', 'Update Failed', 'Could not update attendance records. Please try again.');
      }
    } catch (error) {
      console.error('Error in bulk mark present:', error);
      showToast('error', 'Error', 'An unexpected error occurred during bulk update');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkMarkAbsent = async () => {
    if (!selectedEventId) {
      showToast('error', 'No Event Selected', 'Please select an event to record attendance');
      return;
    }

    const presentMembers = filteredMembers.filter(m => m.status === 'present' || m.status === 'late');
    
    if (presentMembers.length === 0) {
      showToast('info', 'All Absent', 'All members are already marked as absent');
      return;
    }

    setBulkLoading(true);
    try {
      let successCount = 0;
      let conflictCount = 0;
      
      for (let i = 0; i < presentMembers.length; i += BULK_CHUNK_SIZE) {
        const chunk = presentMembers.slice(i, i + BULK_CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map(async (member) => {
            try {
              if (member.recordId) {
                const res = await updateAttendance(member.recordId, {
                  status: 'absent',
                });
                return !!res;
              }
              return false;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : '';
              if (errorMessage.includes('409') || errorMessage.includes('conflict')) {
                conflictCount++;
                return true;
              }
              return false;
            }
          })
        );
        successCount += results.filter(Boolean).length;
      }

      if (successCount > 0) {
        const message = conflictCount > 0 
          ? `Marked ${successCount} members as absent (${conflictCount} conflicts resolved)`
          : `Marked ${successCount} members as absent`;
        showToast('success', 'Bulk Update Complete', message);
        refetchAttendance?.();
      } else {
        showToast('error', 'Update Failed', 'Could not update attendance records. Please try again.');
      }
    } catch (error) {
      console.error('Error in bulk mark absent:', error);
      showToast('error', 'Error', 'An unexpected error occurred during bulk update');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      showToast('info', 'Exporting...', 'Preparing attendance report');

      const headers = ['Member Name', 'Status', 'Check-in Time', 'Event', 'Date'];
      const rows = processedAttendance.map((member) => [
        member.name,
        member.status,
        member.checkIn || '--',
        selectedEvent?.title || 'Unknown',
        formatDate(selectedEvent?.date || getLocalToday()),
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${getLocalToday()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showToast('success', 'Export Complete', 'Attendance report has been downloaded');
    } catch {
      showToast('error', 'Export Failed', 'Could not export attendance report');
    }
  };

  const handleSelfCheckIn = () => {
    showToast(
      'info',
      'Self check-in',
      'This feature is not configured yet. Use the table below or contact an administrator.'
    );
  };

  const handleStatusToggle = async (memberId: string, currentStatus: string, currentRecordId?: string) => {
    if (!selectedEventId) {
      showToast('error', 'No Event Selected', 'Please select an event to record attendance');
      return;
    }

    const statusCycle: Record<string, string> = {
      'absent': 'present',
      'present': 'late',
      'late': 'absent',
    };

    const newStatus = statusCycle[currentStatus] || 'present';
    const now = getLocalNowISO();
    let success = false;

    try {
      if (currentRecordId) {
        const res = await updateAttendance(currentRecordId, { 
          status: newStatus as 'present' | 'absent' | 'late',
          date: now 
        });
        success = !!res;
      } else {
        const member = members?.find(m => m.id === memberId);
        const res = await recordAttendance({
          memberId: memberId,
          memberName: member?.name || 'Unknown',
          status: newStatus as 'present' | 'absent' | 'late',
          date: now,
          eventId: selectedEventId
        });
        success = !!res;
      }

      if (success) {
        const statusLabels = { present: 'Present', absent: 'Absent', late: 'Late' };
        showToast('success', 'Attendance Updated', `Member marked as ${statusLabels[newStatus as keyof typeof statusLabels]}`);
        refetchAttendance?.();
      } else {
        showToast('error', 'Update Failed', 'Could not update attendance. Please try again.');
      }
    } catch (error) {
      console.error('Error toggling attendance status:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      if (errorMessage.includes('409') || errorMessage.includes('conflict')) {
        showToast('error', 'Conflict Detected', 'This attendance record already exists. The data has been updated automatically.');
        refetchAttendance?.();
      } else {
        showToast('error', 'Error', 'An unexpected error occurred while updating attendance');
      }
    }
  };

  const isActionLoading = recordingAttendance || updatingAttendance || bulkLoading;

  const selectedEvent = events?.find(e => String(e.id) === selectedEventId);

  const mainLoading =
    membersLoading || eventsLoading || (Boolean(selectedEventId) && attendanceLoading);

  if (mainLoading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <ErrorBoundary>
      <main className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50">
        <div className="p-6 lg:p-8">
        {(attendanceListError || statsError) && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-1">
            {attendanceListError ? <p>{attendanceListError}</p> : null}
            {statsError ? <p>{statsError}</p> : null}
          </div>
        )}

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-stone-800">Attendance Management</h1>
                  <p className="text-stone-600 mt-0.5">Track, manage, and analyze service attendance</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={handleExportReport}
                className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-all flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button 
                onClick={handleBulkMarkAbsent}
                disabled={isActionLoading || !selectedEventId}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-sm font-medium hover:bg-rose-100 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                Mark All Absent
              </button>
              <button 
                onClick={handleBulkMarkPresent}
                disabled={isActionLoading || !selectedEventId}
                className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <UserCheck className="w-4 h-4" />
                Mark All Present
              </button>
              <button 
                onClick={handleSelfCheckIn}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Self Check-in
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-stone-800">{presentCount}</p>
                <p className="text-sm text-stone-500 font-medium">Present</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${processedAttendance.length > 0 ? (presentCount / processedAttendance.length) * 100 : 0}%` }}
              />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-stone-800">{absentCount}</p>
                <p className="text-sm text-stone-500 font-medium">Absent</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${processedAttendance.length > 0 ? (absentCount / processedAttendance.length) * 100 : 0}%` }}
              />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-stone-800">{lateCount}</p>
                <p className="text-sm text-stone-500 font-medium">Late</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${processedAttendance.length > 0 ? (lateCount / processedAttendance.length) * 100 : 0}%` }}
              />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold text-stone-800">{processedAttendance.length}</p>
                <p className="text-sm text-stone-500 font-medium">Total</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-amber-50 to-orange-50 backdrop-blur-xl rounded-2xl border border-amber-200/50 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                {statsLoading ? (
                  <div className="h-8 w-20 bg-amber-100 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-stone-800">
                      {attendancePercentage}%
                    </p>
                    <p className="text-sm text-stone-500 font-medium">Rate</p>
                  </>
                )}
              </div>
            </div>
            {statsData && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  statsData.attendanceRate >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {statsData.attendanceRate >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {statsData.attendanceRate >= 0 ? '+' : ''}{statsData.attendanceRate}%
                </span>
                <span className="text-xs text-stone-500">vs last month</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-800">Distribution</h3>
                <p className="text-sm text-stone-500">Current event breakdown</p>
              </div>
              <PieChart className="w-5 h-5 text-stone-400" />
            </div>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
                            <p className="font-semibold text-stone-800">{data.name}</p>
                            <p className="text-sm text-stone-600">{data.value} members</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-stone-600">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-800">Monthly Check-ins</h3>
                <p className="text-sm text-stone-500">Present vs late by month</p>
              </div>
              <BarChart3 className="w-5 h-5 text-stone-400" />
            </div>
            <div className="h-48">
              {trendLoading ? (
                <div className="h-full flex items-center justify-center text-stone-400 text-sm animate-pulse">
                  Loading chart…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#78716c', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#78716c', fontSize: 11 }}
                      tickFormatter={(v) =>
                        trendMax >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))
                      }
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
                              <p className="font-semibold text-stone-800 mb-2">{label}</p>
                              <p className="text-sm text-amber-600">
                                Present: {payload[0]?.value?.toLocaleString()}
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
                    <Bar dataKey="present" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Present" />
                    <Bar dataKey="late" fill="#10b981" radius={[4, 4, 0, 0]} name="Late" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-800">Trend Analysis</h3>
                <p className="text-sm text-stone-500">Yearly attendance pattern</p>
              </div>
              <Activity className="w-5 h-5 text-stone-400" />
            </div>
            <div className="h-48">
              {trendLoading ? (
                <div className="h-full flex items-center justify-center text-stone-400 text-sm animate-pulse">
                  Loading chart…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#78716c', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#78716c', fontSize: 11 }}
                      tickFormatter={(v) =>
                        trendMax >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))
                      }
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
                              <p className="font-semibold text-stone-800 mb-2">{label}</p>
                              <p className="text-sm text-amber-600">
                                Present: {payload[0]?.value?.toLocaleString()}
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
                      dataKey="present"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="#f59e0b"
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="late"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="#10b981"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>

        {/* Attendance Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 overflow-hidden shadow-lg"
        >
          {/* Section Header */}
          <div className="p-5 border-b border-stone-100 bg-gradient-to-r from-stone-50 to-amber-50/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">
                    {selectedEvent ? selectedEvent.title : 'Select Event'}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {selectedEvent ? formatDate(selectedEvent.date) : formatDate(selectedDate)}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                  />
                </div>
                
                {/* Date Picker */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="appearance-none pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                  />
                </div>
                
                {/* Event Select */}
                <div className="relative">
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                  >
                    <option value="" disabled>Select Event</option>
                    {events?.map(event => (
                      <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
                
                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
                    showFilters || statusFilter !== 'all'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {statusFilter !== 'all' && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">1</span>
                  )}
                </button>
                
                {/* View Toggle */}
                <div className="flex items-center bg-stone-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'cards'
                        ? 'bg-white text-stone-800 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-stone-800 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 mt-4 border-t border-stone-200">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-stone-600">Status:</span>
                      {['all', 'present', 'late', 'absent'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            statusFilter === status
                              ? status === 'present' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : status === 'late' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : status === 'absent' ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-stone-200 text-stone-700'
                              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          {!selectedEventId ? (
            <div className="py-16">
              <EmptyState
                icon="calendar"
                title="No Event Selected"
                description="Please select an event from the dropdown to view and manage attendance."
                action={{
                  label: "Select Event",
                  onClick: () => {
                    const eventSelect = document.querySelector('select');
                    if (eventSelect) {
                      (eventSelect as HTMLSelectElement).focus();
                    }
                  }
                }}
              />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon="search"
                title="No members found"
                description="No members match your current search criteria."
                action={{
                  label: "Clear Filters",
                  onClick: () => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }
                }}
              />
            </div>
          ) : viewMode === 'cards' ? (
            <>
              {/* Cards View */}
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {paginatedMembers.map((member, index) => {
                      const status = getAttendanceStatusConfig(member.status);
                      return (
                        <motion.div
                          key={member.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.02 }}
                          className={`relative bg-gradient-to-br ${
                            member.status === 'present' ? 'from-emerald-50 to-teal-50 border-emerald-200/50'
                            : member.status === 'late' ? 'from-amber-50 to-orange-50 border-amber-200/50'
                            : 'from-stone-50 to-rose-50/30 border-stone-200/50'
                          } border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group`}
                          onClick={() => handleStatusToggle(member.id, member.status, member.recordId)}
                        >
                          {/* Selection Checkbox */}
                          <div 
                            className="absolute top-3 left-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMemberSelection(member.id);
                            }}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              selectedMembers.has(member.id)
                                ? 'bg-amber-500 border-amber-500'
                                : 'border-stone-300 group-hover:border-amber-400'
                            }`}>
                              {selectedMembers.has(member.id) && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center text-center pt-2">
                            {member.profileImageUrl ? (
                              <img 
                                src={member.profileImageUrl} 
                                alt={member.name}
                                className="w-14 h-14 rounded-xl object-cover shadow-lg ring-2 ring-white"
                              />
                            ) : (
                              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
                                member.status === 'present' ? 'from-emerald-400 to-teal-500'
                                : member.status === 'late' ? 'from-amber-400 to-orange-500'
                                : 'from-stone-300 to-stone-400'
                              } flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                {member.avatar}
                              </div>
                            )}
                            
                            <h4 className="mt-3 font-semibold text-stone-800 text-sm">{member.name}</h4>
                            <p className="text-xs text-stone-500">{member.family}</p>
                            
                            <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${status.bg} ${status.color}`}>
                              <status.icon className="w-3.5 h-3.5" />
                              {status.label}
                            </div>
                            
                            {member.checkIn && (
                              <p className="mt-2 text-xs text-stone-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {member.checkIn}
                              </p>
                            )}
                          </div>
                          
                          {/* Quick Actions */}
                          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {member.status !== 'present' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkPresent(member.id, member.recordId);
                                }}
                                disabled={isActionLoading}
                                className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                                title="Mark Present"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {member.status === 'absent' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkLate(member.id, member.recordId);
                                }}
                                disabled={isActionLoading}
                                className="p-1.5 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                                title="Mark Late"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-between">
                  <p className="text-sm text-stone-500">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length} members
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-amber-500 text-white'
                              : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/50">
                      <th className="py-3 px-6 text-left">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedMembers.size === paginatedMembers.length && paginatedMembers.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500/20"
                          />
                          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Member</span>
                        </div>
                      </th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Family</th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Check-in</th>
                      <th className="text-right py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {paginatedMembers.map((member, index) => {
                        const status = getAttendanceStatusConfig(member.status);
                        return (
                          <motion.tr
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: index * 0.02 }}
                            className="border-b border-stone-50 hover:bg-amber-50/50 transition-colors"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.has(member.id)}
                                  onChange={() => toggleMemberSelection(member.id)}
                                  className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500/20"
                                />
                                {member.profileImageUrl ? (
                                  <img 
                                    src={member.profileImageUrl} 
                                    alt={member.name}
                                    className="w-10 h-10 rounded-xl object-cover shadow-md ring-2 ring-white"
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                                    member.status === 'present' ? 'from-emerald-400 to-teal-500'
                                    : member.status === 'late' ? 'from-amber-400 to-orange-500'
                                    : 'from-stone-300 to-stone-400'
                                  } flex items-center justify-center text-white font-medium text-sm shadow-md`}>
                                    {member.avatar}
                                  </div>
                                )}
                                <span className="font-medium text-stone-800">{member.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-stone-600">{member.family}</span>
                            </td>
                            <td className="py-4 px-6">
                              <button
                                onClick={() => handleStatusToggle(member.id, member.status, member.recordId)}
                                disabled={isActionLoading}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${status.bg} ${status.color}`}
                                title="Click to change status"
                              >
                                <status.icon className="w-3.5 h-3.5" />
                                {status.label}
                              </button>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-stone-600 flex items-center gap-1.5">
                                {member.checkIn ? (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                                    {member.checkIn}
                                  </>
                                ) : (
                                  <span className="text-stone-400">--</span>
                                )}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-end gap-2">
                                {member.status !== 'present' && (
                                  <button 
                                    onClick={() => handleMarkPresent(member.id, member.recordId)}
                                    disabled={isActionLoading}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Present
                                  </button>
                                )}
                                {member.status === 'absent' && (
                                  <button 
                                    onClick={() => handleMarkLate(member.id, member.recordId)}
                                    disabled={isActionLoading}
                                    className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    Late
                                  </button>
                                )}
                                {member.status !== 'absent' && (
                                  <button 
                                    onClick={() => handleMarkAbsent(member.id, member.recordId)}
                                    disabled={isActionLoading}
                                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Absent
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-between">
                  <p className="text-sm text-stone-500">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length} members
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-amber-500 text-white'
                              : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
        </div>
      </main>
      </ErrorBoundary>
    </>
  );
}
