import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Download, DollarSign,
  TrendingUp, ChevronDown, X,
  Gift, Users, Loader2, Calendar,
  Trash2, Mail, RefreshCw, CheckSquare, Square
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { donationMethodColors } from '../constants/colors';
import { fundOptions, donationMethodOptions } from '../constants/options';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [canManageDonations, setCanManageDonations] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [donorProfile, setDonorProfile] = useState<{ id?: string; name?: string; email?: string } | null>(null);
  const [donorHistory, setDonorHistory] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    donorId: '',
    donorName: '',
    donorEmail: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    fundType: 'General Fund',
    method: 'Online',
    isRecurring: false,
    notes: '',
  });

  // Fetch Data
  const donationFilters = useMemo(() => ({
    fundType: selectedFund === 'all' ? undefined : selectedFund,
    method: selectedMethod === 'all' ? undefined : selectedMethod,
    donorId: selectedIndividual !== 'all' && selectedIndividual !== 'anonymous' ? selectedIndividual : undefined,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
    amountMin: amountRange.min ? Number(amountRange.min) : undefined,
    amountMax: amountRange.max ? Number(amountRange.max) : undefined,
  }), [selectedFund, selectedMethod, selectedIndividual, dateRange, amountRange]);

  const { data: donations, isLoading, error, refetch, total } = useDonations(page, pageSize, donationFilters);
  const { data: members } = useMembers(1, 1000);

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

      const matchesMethod = selectedMethod === 'all' || donation.method === selectedMethod;
      const amt = Number(donation.amount) || 0;
      const matchesAmount =
        (!amountRange.min || amt >= Number(amountRange.min)) &&
        (!amountRange.max || amt <= Number(amountRange.max));
      
      return matchesSearch && matchesIndividual && matchesDateRange && matchesMethod && matchesAmount;
    });
  }, [donations, searchQuery, selectedIndividual, dateRange, selectedMethod, amountRange]);

  const totalThisMonth = useMemo(() => {
    if (!filteredDonations) return 0;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    return filteredDonations
      .filter(d => {
        const dDate = new Date(d.date);
        return dDate.getMonth() === thisMonth && dDate.getFullYear() === thisYear;
      })
      .reduce((sum, d) => sum + d.amount, 0);
  }, [filteredDonations]);

  const recurringTotal = useMemo(() => {
    if (!filteredDonations) return 0;
    return filteredDonations.filter(d => d.isRecurring).reduce((sum, d) => sum + d.amount, 0);
  }, [filteredDonations]);

  const ytdTotal = useMemo(() => {
    if (!filteredDonations) return 0;
    const thisYear = new Date().getFullYear();
    return filteredDonations
      .filter(d => new Date(d.date).getFullYear() === thisYear)
      .reduce((sum, d) => sum + d.amount, 0);
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

  const monthlyTrend = useMemo(() => {
    if (!filteredDonations) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend: Record<string, number> = {};
    
    const thisYear = new Date().getFullYear();
    filteredDonations
      .filter(d => new Date(d.date).getFullYear() === thisYear)
      .forEach(d => {
        const month = months[new Date(d.date).getMonth()];
        trend[month] = (trend[month] || 0) + d.amount;
      });

    return months.map(name => ({
      name,
      amount: trend[name] || 0
    }));
  }, [filteredDonations]);

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
        fundType: formData.fundType,
        method: formData.method,
        isRecurring: formData.isRecurring,
        notes: formData.notes,
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
          fundType: 'General Fund',
          method: 'Online',
          isRecurring: false,
          notes: '',
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
      + donations.map(d => `${d.donorName || 'Anonymous'},${d.donorEmail || ''},${d.amount},${d.fundType},${d.method},${d.date},${d.isRecurring ? 'Yes' : 'No'}`).join("\n");
    
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
      + selected.map(d => `${d.donorName || 'Anonymous'},${d.donorEmail || ''},${d.amount},${d.fundType},${d.method},${d.date},${d.isRecurring ? 'Yes' : 'No'},${d.receiptNumber || ''},${d.reference || ''}`).join("\n");
    
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
      `Method: ${d.method}`,
      d.reference ? `Reference: ${d.reference}` : '',
      d.isRecurring ? `Recurring: Yes` : `Recurring: No`,
    ].filter(Boolean);
    return lines.join('\n');
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

  const deleteSelected = async () => {
    if (!canManageDonations) {
      showNotification('error', 'Insufficient permissions', 'Only staff or admins can delete donations.');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => api.donations.deleteDonation(id)));
      showNotification('success', 'Donations deleted', `${ids.length} donations removed.`);
      setSelectedIds(new Set());
      refetch();
    } catch {
      showNotification('error', 'Delete failed', 'Could not delete one or more donations.');
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
                    onClick={deleteSelected}
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
                <p className="text-2xl font-bold text-stone-800">${totalThisMonth.toLocaleString()}</p>
                <p className="text-xs text-stone-500">This Month</p>
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
                <p className="text-xs text-stone-500">Recurring</p>
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
                <p className="text-xs text-stone-500">Donors</p>
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
                <p className="text-2xl font-bold text-stone-800">${(ytdTotal/1000).toFixed(1)}K</p>
                <p className="text-xs text-stone-500">YTD Total</p>
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
            <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">Monthly Giving</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} tickFormatter={(v) => `$${v/1000}k`} />
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
            <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">Fund Distribution</h3>
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
                    aria-label="Filter by fund"
                  >
                    <option value="all">All Funds</option>
                    {fundOptions.map(opt => (
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
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Calendar className="w-4 h-4" />
                  <span>Date Range:</span>
                </div>
                <div className="flex flex-col lg:flex-row gap-4 flex-1">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      placeholder="Start date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      aria-label="Start date"
                    />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="date"
                      placeholder="End date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      aria-label="End date"
                    />
                  </div>
                  <button
                    onClick={() => setDateRange({ startDate: '', endDate: '' })}
                    className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Clear Dates
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
                  <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Fund</th>
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
                    <td colSpan={6} className="py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
                      <p className="text-stone-500 text-sm">Loading donations...</p>
                    </td>
                  </tr>
                ) : filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
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
                        <span className="text-sm text-stone-600">{donation.fundType}</span>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${donationMethodColors[donation.method as keyof typeof donationMethodColors] || 'bg-stone-100 text-stone-700'}`}>
                          {donation.method}
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
                            className="p-1.5 rounded-lg hover:bg-stone-100"
                            title="Email receipt"
                            href={donation.donorEmail ? `mailto:${donation.donorEmail}?subject=${encodeURIComponent(`Donation Receipt ${donation.receiptNumber || ''}`)}&body=${encodeURIComponent(generateReceiptText(donation))}` : undefined}
                            aria-disabled={!donation.donorEmail}
                          >
                            <Mail className="w-4 h-4 text-stone-600" />
                          </a>
                          {canManageDonations && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-rose-50"
                              title="Delete donation"
                              onClick={() => {
                                setSelectedIds(new Set([donation.id]));
                                deleteSelected();
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
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
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
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Fund</label>
                    <select 
                      required
                      value={formData.fundType}
                      onChange={(e) => setFormData({ ...formData, fundType: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                    >
                      {fundOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Payment Method</label>
                    <select 
                      required
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                    >
                      {donationMethodOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
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
                          <td className="py-2 px-4 text-sm text-stone-700">{d.method}</td>
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
