import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Download, DollarSign,
  TrendingUp, ChevronDown, X,
  Gift, Users, Loader2, Calendar,
  Trash2, Mail, RefreshCw, CheckSquare, Square,
  CalendarDays, CalendarRange, CalendarClock, CalendarCheck,
  Printer
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { donationMethodColors, donationCategoryColors } from '../constants/colors';
import { donationMethodOptions, donationCategoryOptions } from '../constants/options';
import { useDonations, useMembers } from '../hooks/useData';
import { useAPI } from '../hooks/useAPI';
import { useNotification } from '../hooks/useNotification';
import { supabase } from '../services/supabaseClient';
import { supabaseApi } from '../services/supabaseApi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

export default function Donations() {
  const { api } = useAPI();
  const { show: showNotification } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFund, setSelectedFund] = useState('all');
  const [selectedIndividual, setSelectedIndividual] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [canManageDonations, setCanManageDonations] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [donorProfile, setDonorProfile] = useState<{ id?: string; name?: string; email?: string } | null>(null);
  const [donorHistory, setDonorHistory] = useState<any[]>([]);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [receiptDonation, setReceiptDonation] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    donorId: '',
    donorName: '',
    donorEmail: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Offering',
    paymentMethod: 'Online',
    isRecurring: false,
    notes: '',
    reference: '',
  });

  // Fetch Data
  // Helper function to get date range based on preset
  const getDateRangeFromPreset = useCallback((preset: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'week': {
        const startOfWeek = new Date(today);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday as start
        startOfWeek.setDate(diff);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0]
        };
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0]
        };
      }
      case 'year': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        return {
          startDate: startOfYear.toISOString().split('T')[0],
          endDate: endOfYear.toISOString().split('T')[0]
        };
      }
      default:
        return { startDate: '', endDate: '' };
    }
  }, []);

  // Handle date preset change
  const handleDatePresetChange = useCallback((preset: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom') => {
    setDatePreset(preset);
    if (preset === 'all') {
      setDateRange({ startDate: '', endDate: '' });
    } else if (preset !== 'custom') {
      setDateRange(getDateRangeFromPreset(preset));
    }
  }, [getDateRangeFromPreset]);

  const donationFilters = useMemo(() => ({
    fundType: selectedFund === 'all' ? undefined : selectedFund,
    paymentMethod: selectedMethod === 'all' ? undefined : selectedMethod,
    donorId: selectedIndividual !== 'all' && selectedIndividual !== 'anonymous' ? selectedIndividual : undefined,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    amountMin: amountRange.min ? Number(amountRange.min) : undefined,
    amountMax: amountRange.max ? Number(amountRange.max) : undefined,
  }), [selectedFund, selectedMethod, selectedIndividual, dateRange, amountRange]);

  const { data: donations, isLoading, error, refetch, total } = useDonations(page, pageSize, donationFilters);
  const { data: members } = useMembers(1, 1000);

  // Keep selection scoped to the currently visible dataset (page/filters/search)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, donationFilters, searchQuery]);

  // Sync custom date changes with preset state
  useEffect(() => {
    if (dateRange.startDate || dateRange.endDate) {
      if (datePreset !== 'custom' && datePreset !== 'all') {
        const presetRange = getDateRangeFromPreset(datePreset);
        if (presetRange.startDate !== dateRange.startDate || presetRange.endDate !== dateRange.endDate) {
          setDatePreset('custom');
        }
      }
    }
  }, [dateRange, datePreset, getDateRangeFromPreset]);

  const filteredDonations = useMemo(() => {
    if (!donations) return [];
    return donations.filter(donation => {
      const donorName = donation.donorName || 'Anonymous';
      const matchesSearch = donorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (donation.donorEmail && donation.donorEmail.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesIndividual = selectedIndividual === 'all' || 
                               donation.donorId === selectedIndividual ||
                               (selectedIndividual === 'anonymous' && (!donation.donorId || donation.donorName === 'Anonymous'));
      
      const donationDate = new Date(donation.date);
      const matchesDateRange = (!dateRange.startDate || donationDate >= new Date(dateRange.startDate)) &&
                              (!dateRange.endDate || donationDate <= new Date(dateRange.endDate));

      const matchesMethod = selectedMethod === 'all' || donation.paymentMethod === selectedMethod;
      const amt = Number(donation.amount) || 0;
      const matchesAmount =
        (!amountRange.min || amt >= Number(amountRange.min)) &&
        (!amountRange.max || amt <= Number(amountRange.max));
      
      return matchesSearch && matchesIndividual && matchesDateRange && matchesMethod && matchesAmount;
    });
  }, [donations, searchQuery, selectedIndividual, dateRange, selectedMethod, amountRange]);

  // Calculate filtered total based on current filter selection
  const filteredTotal = useMemo(() => {
    if (!filteredDonations) return 0;
    return filteredDonations.reduce((sum, d) => sum + d.amount, 0);
  }, [filteredDonations]);

  // Dynamic label based on date preset
  const periodLabel = useMemo(() => {
    switch (datePreset) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'custom': return 'Selected Period';
      default: return 'Total';
    }
  }, [datePreset]);

  // Count of donations in current filter
  const filteredCount = useMemo(() => {
    return filteredDonations?.length || 0;
  }, [filteredDonations]);

  // Average donation in current filter
  const averageDonation = useMemo(() => {
    if (!filteredDonations || filteredDonations.length === 0) return 0;
    return filteredTotal / filteredDonations.length;
  }, [filteredDonations, filteredTotal]);

  const recurringTotal = useMemo(() => {
    if (!filteredDonations) return 0;
    return filteredDonations.filter(d => d.isRecurring).reduce((sum, d) => sum + d.amount, 0);
  }, [filteredDonations]);

  const recurringCount = useMemo(() => {
    if (!filteredDonations) return 0;
    return filteredDonations.filter(d => d.isRecurring).length;
  }, [filteredDonations]);

  const fundDistribution = useMemo(() => {
    if (!filteredDonations) return [];
    const distribution: Record<string, number> = {};
    filteredDonations.forEach(d => {
      distribution[d.fundType] = (distribution[d.fundType] || 0) + d.amount;
    });
    
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    return Object.entries(distribution).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [filteredDonations]);

  // Dynamic trend chart based on filter selection
  const trendData = useMemo(() => {
    if (!filteredDonations || filteredDonations.length === 0) return [];
    
    // For day view - show hourly breakdown
    if (datePreset === 'today') {
      const hours: Record<string, number> = {};
      for (let i = 0; i < 24; i++) {
        hours[i.toString().padStart(2, '0')] = 0;
      }
      filteredDonations.forEach(d => {
        const hour = new Date(d.date).getHours().toString().padStart(2, '0');
        hours[hour] = (hours[hour] || 0) + d.amount;
      });
      return Object.entries(hours).map(([hour, amount]) => ({
        name: `${hour}:00`,
        amount
      }));
    }
    
    // For week view - show daily breakdown
    if (datePreset === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayTotals: Record<string, number> = {};
      days.forEach(d => dayTotals[d] = 0);
      
      filteredDonations.forEach(d => {
        const date = new Date(d.date);
        const dayIndex = date.getDay();
        const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1]; // Adjust for Monday start
        dayTotals[dayName] = (dayTotals[dayName] || 0) + d.amount;
      });
      
      return days.map(name => ({ name, amount: dayTotals[name] || 0 }));
    }
    
    // For month view - show weekly breakdown
    if (datePreset === 'month') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
      const weekTotals: Record<string, number> = {};
      weeks.forEach(w => weekTotals[w] = 0);
      
      filteredDonations.forEach(d => {
        const date = new Date(d.date);
        const dayOfMonth = date.getDate();
        const weekNum = Math.min(Math.ceil(dayOfMonth / 7), 5);
        const weekName = `Week ${weekNum}`;
        weekTotals[weekName] = (weekTotals[weekName] || 0) + d.amount;
      });
      
      return weeks.map(name => ({ name, amount: weekTotals[name] || 0 }));
    }
    
    // For year or all - show monthly breakdown
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend: Record<string, number> = {};
    months.forEach(m => trend[m] = 0);
    
    filteredDonations.forEach(d => {
      const month = months[new Date(d.date).getMonth()];
      trend[month] = (trend[month] || 0) + d.amount;
    });

    return months.map(name => ({
      name,
      amount: trend[name] || 0
    }));
  }, [filteredDonations, datePreset]);

  // Dynamic chart title based on filter
  const chartTitle = useMemo(() => {
    switch (datePreset) {
      case 'today': return 'Hourly Giving';
      case 'week': return 'Daily Giving';
      case 'month': return 'Weekly Giving';
      case 'year': return 'Monthly Giving';
      case 'custom': return 'Giving Trend';
      default: return 'Monthly Giving';
    }
  }, [datePreset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.amount || Number(formData.amount) <= 0) {
        showNotification('error', 'Invalid amount', 'Please enter a valid donation amount.');
        setIsSubmitting(false);
        return;
      }
      const selectedMember = members.find(m => m.id === formData.donorId);
      const response = await api.donations.createDonation({
        donorId: formData.donorId === 'anonymous' ? undefined : formData.donorId,
        donorName: formData.donorId === 'anonymous' ? 'Anonymous' : selectedMember?.name,
        donorEmail: formData.donorId === 'anonymous' ? undefined : selectedMember?.email,
        amount: Number(formData.amount),
        date: formData.date,
        fundType: formData.category,
        paymentMethod: formData.paymentMethod,
        isRecurring: formData.isRecurring,
        notes: formData.notes,
        reference: formData.reference,
      });

      if (response.success) {
        setShowAddModal(false);
        showNotification('success', 'Donation recorded', 'The donation has been saved and a receipt number generated.');
        setFormData({
          donorId: '',
          donorName: '',
          donorEmail: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          category: 'Offering',
          paymentMethod: 'Online',
          isRecurring: false,
          notes: '',
          reference: '',
        });
        refetch();
      } else {
        showNotification('error', 'Failed to record donation', response.error || 'An error occurred while saving the donation.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Unexpected error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async () => {
      try {
        const ok = await supabaseApi.auth.isStaffOrAdmin();
        if (mounted) setCanManageDonations(Boolean(ok));
      } catch {
        if (mounted) setCanManageDonations(false);
      }
    });
    const channel = supabase
      .channel('donations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        () => {
          refetch();
          showNotification('info', 'Donations updated', 'New changes detected in donations.');
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [refetch, showNotification]);

  const handleExport = () => {
    if (!donations) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Donor,Email,Amount,Fund,Method,Date,Recurring\n"
      + donations.map(d => `${d.donorName || 'Anonymous'},${d.donorEmail || ''},${d.amount},${d.fundType},${d.paymentMethod},${d.date},${d.isRecurring ? 'Yes' : 'No'}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `donations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSelected = () => {
    if (!donations || selectedIds.size === 0) return;
    const selected = donations.filter(d => selectedIds.has(d.id));
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Donor,Email,Amount,Fund,Method,Date,Recurring,Receipt,Reference\n"
      + selected.map(d => `${d.donorName || 'Anonymous'},${d.donorEmail || ''},${d.amount},${d.fundType},${d.paymentMethod},${d.date},${d.isRecurring ? 'Yes' : 'No'},${d.receiptNumber || ''},${d.reference || ''}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `donations_selected_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredDonations.map(d => d.id);
    setSelectedIds(prev => {
      const allSelected = visibleIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const generateReceiptText = (d: any) => {
    const lines = [
      `Receipt Number: ${d.receiptNumber || 'N/A'}`,
      `Date: ${new Date(d.date).toLocaleDateString()}`,
      `Donor: ${d.donorName || 'Anonymous'}`,
      `Email: ${d.donorEmail || '-'}`,
      `Amount: $${Number(d.amount).toLocaleString()}`,
      `Fund: ${d.fundType}`,
      `Method: ${d.paymentMethod}`,
      d.reference ? `Reference: ${d.reference}` : '',
      d.isRecurring ? `Recurring: Yes` : `Recurring: No`,
    ].filter(Boolean);
    return lines.join('\n');
  };

  const openPrintReceipt = (donation: any) => {
    setReceiptDonation(donation);
    setShowPrintReceipt(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const sendEmailReceipts = () => {
    if (!donations || selectedIds.size === 0) return;
    const selected = donations.filter(d => selectedIds.has(d.id) && d.donorEmail);
    if (selected.length === 0) {
      showNotification('warning', 'No emails available', 'Selected donations do not include donor email addresses.');
      return;
    }
    selected.forEach(d => {
      const subject = encodeURIComponent(`Donation Receipt ${d.receiptNumber || ''}`);
      const body = encodeURIComponent(generateReceiptText(d));
      window.open(`mailto:${d.donorEmail}?subject=${subject}&body=${body}`, '_blank');
    });
    showNotification('success', 'Email drafts opened', 'Receipts prepared in your email client.');
  };

  const deleteSelected = async (idsFromCaller?: string[]) => {
    if (!canManageDonations) {
      showNotification('error', 'Insufficient permissions', 'Only staff or admins can delete donations.');
      return;
    }
    const ids = idsFromCaller ?? Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const results = await Promise.all(ids.map((id) => api.donations.deleteDonation(id)));
      const failures = results
        .map((res, idx) => ({ res, id: ids[idx] }))
        .filter(({ res }) => !res?.success);

      if (failures.length === 0) {
        showNotification('success', 'Donations deleted', `${ids.length} donations removed.`);
        setSelectedIds(new Set());
        refetch();
        return;
      }

      // Some (or all) deletes failed (commonly due to RLS / permissions)
      const firstError = failures[0]?.res?.error;
      const deletedCount = ids.length - failures.length;
      showNotification(
        'error',
        'Delete failed',
        `${deletedCount} deleted, ${failures.length} failed.${firstError ? ` ${firstError}` : ''}`
      );

      // Refresh anyway in case some succeeded
      if (deletedCount > 0) {
        setSelectedIds(new Set());
        refetch();
      }
    } catch (e) {
      showNotification(
        'error',
        'Delete failed',
        e instanceof Error ? e.message : 'Could not delete one or more donations.'
      );
    }
  };

  const openDonorProfile = useCallback(async (donation: any) => {
    if (!donation.donorId && !donation.donorEmail) {
      setDonorProfile({ name: 'Anonymous' });
      setDonorHistory([]);
      setShowDonorModal(true);
      return;
    }
    const profile = {
      id: donation.donorId,
      name: donation.donorName,
      email: donation.donorEmail,
    };
    setDonorProfile(profile);
    try {
      const res = await api.donations.getDonations({
        donorId: donation.donorId,
        page: 1,
        pageSize: 100,
      } as any);
      setDonorHistory(res.data || []);
    } catch {
      setDonorHistory([]);
    }
    setShowDonorModal(true);
  }, [api.donations]);
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">Error loading donations: {error}</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-amber-500 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <>
      <Header />
      <ErrorBoundary>
      <main className="p-6 lg:p-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-stone-800">Donations</h1>
              <p className="text-stone-600 mt-1">Track and manage giving</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={handleExport}
                className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Record Donation
              </button>
            </div>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-stone-100 bg-stone-50">
              <p className="text-sm text-stone-700">{selectedIds.size} selected</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportSelected}
                  className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm hover:bg-stone-100"
                >
                  Export Selected
                </button>
                <button
                  onClick={sendEmailReceipts}
                  className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm hover:bg-stone-100 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email Receipts
                </button>
                {canManageDonations && (
                  <button
                    onClick={() => deleteSelected()}
                    className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">${filteredTotal.toLocaleString()}</p>
                <p className="text-xs text-stone-500">{periodLabel}</p>
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">${recurringTotal.toLocaleString()}</p>
                <p className="text-xs text-stone-500">Recurring ({recurringCount})</p>
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{new Set(filteredDonations?.map(d => d.donorId || d.donorName)).size}</p>
                <p className="text-xs text-stone-500">Donors ({filteredCount} gifts)</p>
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">${averageDonation.toFixed(0)}</p>
                <p className="text-xs text-stone-500">Avg Gift</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
          >
            <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">{chartTitle}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `$${v/1000}k` : `$${v}`} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
                            <p className="font-semibold text-stone-800">{label}</p>
                            <p className="text-sm text-emerald-600">${payload[0].value?.toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
          >
            <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">Category Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={fundDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {fundDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {fundDistribution.map((fund) => (
                <div key={fund.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fund.color }} />
                    <span className="text-stone-600">{fund.name}</span>
                  </div>
                  <span className="font-medium text-stone-800">${(fund.value/1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Donations Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 overflow-hidden"
        >
          <div className="p-4 border-b border-stone-100">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search donations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    aria-label="Search donations by donor name or email"
                  />
                </div>
                <div className="relative">
                  <select
                    value={selectedIndividual}
                    onChange={(e) => setSelectedIndividual(e.target.value)}
                    className="appearance-none pl-4 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    aria-label="Filter by individual"
                  >
                    <option value="all">All Individuals</option>
                    <option value="anonymous">Anonymous</option>
                    {members?.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={selectedFund}
                    onChange={(e) => setSelectedFund(e.target.value)}
                    className="appearance-none pl-4 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    aria-label="Filter by category"
                  >
                    <option value="all">All Categories</option>
                    {donationCategoryOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="appearance-none pl-4 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    aria-label="Filter by payment method"
                  >
                    <option value="all">All Methods</option>
                    {donationMethodOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
              </div>
              {/* Date Preset Quick Filters */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm text-stone-600 mr-2">Quick Filter:</span>
                {[
                  { key: 'all', label: 'All Time', icon: CalendarDays },
                  { key: 'today', label: 'Today', icon: CalendarCheck },
                  { key: 'week', label: 'This Week', icon: CalendarClock },
                  { key: 'month', label: 'This Month', icon: Calendar },
                  { key: 'year', label: 'This Year', icon: CalendarRange },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleDatePresetChange(key as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      datePreset === key
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Calendar className="w-4 h-4" />
                  <span>Custom Range:</span>
                </div>
                <div className="flex flex-col lg:flex-row gap-4 flex-1">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      placeholder="Start date"
                      value={dateRange.startDate}
                      onChange={(e) => {
                        setDateRange(prev => ({ ...prev, startDate: e.target.value }));
                        if (datePreset !== 'custom') setDatePreset('custom');
                      }}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      aria-label="Start date"
                    />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="date"
                      placeholder="End date"
                      value={dateRange.endDate}
                      onChange={(e) => {
                        setDateRange(prev => ({ ...prev, endDate: e.target.value }));
                        if (datePreset !== 'custom') setDatePreset('custom');
                      }}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      aria-label="End date"
                    />
                  </div>
                  <button
                    onClick={() => handleDatePresetChange('all')}
                    className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-600">Amount:</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Min"
                    value={amountRange.min}
                    onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                    className="w-28 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    aria-label="Minimum amount"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Max"
                    value={amountRange.max}
                    onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                    className="w-28 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    aria-label="Maximum amount"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Donations">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left py-3 px-6">
                    <button
                      className="p-1 rounded hover:bg-stone-100"
                      onClick={toggleSelectAllVisible}
                      aria-label="Select all visible donations"
                      title="Select all"
                    >
                      {filteredDonations.every(d => selectedIds.has(d.id)) && filteredDonations.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-stone-600" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Donor</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Category</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Method</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Recurring</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Reference</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Receipt</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
                      <p className="text-stone-500 text-sm">Loading donations...</p>
                    </td>
                  </tr>
                ) : filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <p className="text-stone-500 text-sm">No donations found</p>
                    </td>
                  </tr>
                ) : (
                  filteredDonations.map((donation, index) => (
                    <motion.tr
                      key={donation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-stone-50 hover:bg-amber-50/50 transition-colors"
                    >
                      <td className="py-3 px-6">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-stone-300 text-amber-500"
                            checked={selectedIds.has(donation.id)}
                            onChange={() => toggleSelect(donation.id)}
                            aria-label={`Select donation from ${donation.donorName || 'Anonymous'} on ${new Date(donation.date).toLocaleDateString()}`}
                          />
                        </label>
                      </td>
                      <td className="py-3 px-6">
                        <div>
                          <button
                            className="font-medium text-stone-800 hover:underline"
                            onClick={() => openDonorProfile(donation)}
                            title="View donor profile and giving history"
                          >
                            {donation.donorName || 'Anonymous'}
                          </button>
                          <p className="text-xs text-stone-500">{donation.donorEmail || '-'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span className="font-semibold text-emerald-600">${donation.amount.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${donationCategoryColors[donation.fundType as keyof typeof donationCategoryColors] || 'bg-stone-100 text-stone-700'}`}>
                          {donation.fundType}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${donationMethodColors[donation.paymentMethod as keyof typeof donationMethodColors] || 'bg-stone-100 text-stone-700'}`}>
                          {donation.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-sm text-stone-600">{new Date(donation.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </td>
                      <td className="py-3 px-6">
                        {donation.isRecurring ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">Yes</span>
                        ) : (
                          <span className="text-xs text-stone-400">No</span>
                        )}
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-xs text-stone-600">{donation.reference || '-'}</span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-xs text-stone-600">{donation.receiptNumber || '-'}</span>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-1.5 rounded-lg hover:bg-stone-100"
                            title="Refresh status"
                            onClick={() => refetch()}
                          >
                            <RefreshCw className="w-4 h-4 text-stone-600" />
                          </button>
                          <a
                            className={`p-1.5 rounded-lg ${donation.donorEmail ? 'hover:bg-stone-100' : 'opacity-40 cursor-not-allowed'}`}
                            title="Email receipt"
                            href={donation.donorEmail ? `mailto:${donation.donorEmail}?subject=${encodeURIComponent(`Donation Receipt ${donation.receiptNumber || ''}`)}&body=${encodeURIComponent(generateReceiptText(donation))}` : undefined}
                            aria-disabled={!donation.donorEmail}
                            onClick={(e) => {
                              if (!donation.donorEmail) e.preventDefault();
                            }}
                          >
                            <Mail className="w-4 h-4 text-stone-600" />
                          </a>
                          <button
                            className="p-1.5 rounded-lg hover:bg-emerald-50"
                            title="Print receipt"
                            onClick={() => openPrintReceipt(donation)}
                          >
                            <Printer className="w-4 h-4 text-emerald-600" />
                          </button>
                          {canManageDonations && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-rose-50"
                              title="Delete donation"
                              onClick={() => {
                                deleteSelected([donation.id]);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Add Donation Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-serif font-bold text-stone-800">Record Donation</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Donor</label>
                    <select 
                      required
                      value={formData.donorId}
                      onChange={(e) => setFormData({ ...formData, donorId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                      aria-label="Donor"
                    >
                      <option value="">Select donor...</option>
                      <option value="anonymous">Anonymous</option>
                      {members?.map(member => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Category Selection with Visual Cards */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
                    <div className="grid grid-cols-4 gap-2">
                      {donationCategoryOptions.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            formData.category === cat
                              ? donationCategoryColors[cat as keyof typeof donationCategoryColors] || 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                              : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Amount</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          required
                          type="number" 
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full pl-8 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                      <input 
                        required
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Payment Method</label>
                      <select 
                        required
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                      >
                        {donationMethodOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Reference (Optional)</label>
                      <input 
                        type="text"
                        placeholder="e.g., Check #1234"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Notes (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Add any notes about this donation..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30 resize-none" 
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="recurring" 
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="rounded border-stone-300 text-amber-500 focus:ring-amber-500/20" 
                    />
                    <label htmlFor="recurring" className="text-sm text-stone-700">This is a recurring donation</label>
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center justify-center gap-2"
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Record Donation
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Print Receipt Modal */}
        <AnimatePresence>
          {showPrintReceipt && receiptDonation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowPrintReceipt(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
              >
                {/* Printable Receipt Content */}
                <div className="p-8 print:p-4" id="receipt-content">
                  {/* Church Header */}
                  <div className="text-center mb-6 border-b border-stone-200 pb-6">
                    <h1 className="text-2xl font-serif font-bold text-stone-800">Greater Works City Church</h1>
                    <p className="text-sm text-stone-500 mt-1">123 Faith Avenue, Greater Works City</p>
                    <p className="text-sm text-stone-500">Tel: +233543871470</p>
                  </div>

                  {/* Receipt Title */}
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-semibold text-stone-700 uppercase tracking-wide">Donation Receipt</h2>
                  </div>

                  {/* Receipt Details */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-stone-200">
                      <span className="text-sm text-stone-500">Receipt No:</span>
                      <span className="text-sm font-semibold text-stone-800">{receiptDonation.receiptNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-stone-200">
                      <span className="text-sm text-stone-500">Date:</span>
                      <span className="text-sm font-semibold text-stone-800">{new Date(receiptDonation.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-stone-200">
                      <span className="text-sm text-stone-500">Donor:</span>
                      <span className="text-sm font-semibold text-stone-800">{receiptDonation.donorName || 'Anonymous'}</span>
                    </div>
                    {receiptDonation.donorEmail && (
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-stone-200">
                        <span className="text-sm text-stone-500">Email:</span>
                        <span className="text-sm text-stone-800">{receiptDonation.donorEmail}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-stone-200">
                      <span className="text-sm text-stone-500">Category:</span>
                      <span className="text-sm font-semibold text-stone-800">{receiptDonation.fundType}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-stone-200">
                      <span className="text-sm text-stone-500">Payment Method:</span>
                      <span className="text-sm text-stone-800">{receiptDonation.paymentMethod}</span>
                    </div>
                    {receiptDonation.reference && (
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-stone-200">
                        <span className="text-sm text-stone-500">Reference:</span>
                        <span className="text-sm text-stone-800">{receiptDonation.reference}</span>
                      </div>
                    )}
                    {receiptDonation.isRecurring && (
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-stone-200">
                        <span className="text-sm text-stone-500">Recurring:</span>
                        <span className="text-sm text-blue-600 font-medium">Yes</span>
                      </div>
                    )}
                    {receiptDonation.notes && (
                      <div className="py-2">
                        <span className="text-sm text-stone-500">Notes:</span>
                        <p className="text-sm text-stone-700 mt-1">{receiptDonation.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Amount Section */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-stone-700">Amount</span>
                      <span className="text-2xl font-bold text-emerald-600">${Number(receiptDonation.amount).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-xs text-stone-400 border-t border-stone-200 pt-4">
                    <p>Thank you for your generous contribution!</p>
                    <p className="mt-1">This receipt is for your records and may be used for tax purposes.</p>
                    <p className="mt-2 text-stone-500">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* Action Buttons - Hidden when printing */}
                <div className="flex gap-3 p-4 border-t border-stone-100 print:hidden">
                  <button
                    onClick={() => setShowPrintReceipt(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                  >
                    Close
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Donor Profile Modal */}
        <AnimatePresence>
          {showDonorModal && donorProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowDonorModal(false)}
              aria-modal="true"
              role="dialog"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-serif font-bold text-stone-800">Donor Profile</h2>
                  <button
                    onClick={() => setShowDonorModal(false)}
                    className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-stone-800 font-medium">{donorProfile.name || 'Anonymous'}</p>
                  <p className="text-sm text-stone-600">{donorProfile.email || '-'}</p>
                </div>
                <div className="h-64 overflow-y-auto border border-stone-200 rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Amount</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Fund</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donorHistory.map((d, i) => (
                        <tr key={`${d.id}-${i}`} className="border-b border-stone-50">
                          <td className="py-2 px-4 text-sm text-stone-700">{new Date(d.date).toLocaleDateString()}</td>
                          <td className="py-2 px-4 text-sm text-stone-700">${Number(d.amount).toLocaleString()}</td>
                          <td className="py-2 px-4 text-sm text-stone-700">{d.fundType}</td>
                          <td className="py-2 px-4 text-sm text-stone-700">{d.paymentMethod}</td>
                        </tr>
                      ))}
                      {donorHistory.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-stone-500 text-sm">No giving history</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-stone-600">Total: {total || 0}</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm hover:bg-stone-100 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-sm text-stone-700">Page {page}</span>
            <button
              className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm hover:bg-stone-100 disabled:opacity-50"
              disabled={(total || 0) <= page * pageSize}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
            <select
              className="ml-2 px-2 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              aria-label="Rows per page"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </main>
      </ErrorBoundary>
    </>
  );
}
