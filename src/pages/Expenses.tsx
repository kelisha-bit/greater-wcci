import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Download, DollarSign,
  X, Loader2, Trash2,
  CheckSquare, Square,
  Check, AlertCircle, FileText
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAPI } from '../hooks/useAPI';
import { useNotification } from '../hooks/useNotification';
import type { Expense } from '../services/api';
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

// Expense categories
const EXPENSE_CATEGORIES = [
  { value: 'utilities', label: 'Utilities', color: '#3B82F6' },
  { value: 'salaries', label: 'Salaries', color: '#8B5CF6' },
  { value: 'maintenance', label: 'Maintenance', color: '#F59E0B' },
  { value: 'supplies', label: 'Supplies', color: '#10B981' },
  { value: 'ministry', label: 'Ministry', color: '#EC4899' },
  { value: 'outreach', label: 'Outreach', color: '#06B6D4' },
  { value: 'missions', label: 'Missions', color: '#F97316' },
  { value: 'events', label: 'Events', color: '#84CC16' },
  { value: 'equipment', label: 'Equipment', color: '#6366F1' },
  { value: 'insurance', label: 'Insurance', color: '#EF4444' },
  { value: 'professional_services', label: 'Professional Services', color: '#14B8A6' },
  { value: 'rent_mortgage', label: 'Rent/Mortgage', color: '#A855F7' },
  { value: 'marketing', label: 'Marketing', color: '#F43F5E' },
  { value: 'benevolence', label: 'Benevolence', color: '#0EA5E9' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

export default function Expenses() {
  const { api } = useAPI();
  const { show: showNotification } = useNotification();
  
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedApproval, setSelectedApproval] = useState<'all' | 'approved' | 'pending'>('all');
  const [amountRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  
  // UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [canManageExpenses, setCanManageExpenses] = useState(false);
  
  // Stats
  const [stats, setStats] = useState<{
    totalExpenses: number;
    approvedExpenses: number;
    pendingExpenses: number;
    categoryTotals: Record<string, number>;
    expenseCount: number;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'other',
    paymentMethod: 'cash',
    paymentReference: '',
    vendorName: '',
    vendorContact: '',
    budgetCategory: '',
    notes: '',
    isRecurring: false,
    recurringFrequency: '',
  });

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
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
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

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters: any = {
        page,
        pageSize,
      };
      
      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      if (selectedMethod !== 'all') filters.paymentMethod = selectedMethod;
      if (selectedApproval === 'approved') filters.isApproved = true;
      if (selectedApproval === 'pending') filters.isApproved = false;
      if (amountRange.min) filters.amountMin = parseFloat(amountRange.min);
      if (amountRange.max) filters.amountMax = parseFloat(amountRange.max);
      
      const effectiveDateRange = datePreset !== 'custom' ? getDateRangeFromPreset(datePreset) : dateRange;
      if (effectiveDateRange.startDate) filters.dateFrom = effectiveDateRange.startDate;
      if (effectiveDateRange.endDate) filters.dateTo = effectiveDateRange.endDate;
      
      const response = await api.expenses.getExpenses(filters);
      
      if (response.success && response.data) {
        setExpenses(response.data);
        setTotalCount(response.total);
      } else {
        setError(response.error || 'Failed to load expenses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, searchQuery, selectedCategory, selectedMethod, selectedApproval, amountRange, dateRange, datePreset, getDateRangeFromPreset]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const effectiveDateRange = datePreset !== 'custom' ? getDateRangeFromPreset(datePreset) : dateRange;
      const response = await api.expenses.getExpenseStats({
        dateFrom: effectiveDateRange.startDate || undefined,
        dateTo: effectiveDateRange.endDate || undefined,
      });
      
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch expense stats:', err);
    }
  }, [api, dateRange, datePreset, getDateRangeFromPreset]);

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const response = await api.auth.isStaffOrAdmin();
        if (response.success && response.data) {
          setCanManageExpenses(response.data.isStaffOrAdmin);
        }
      } catch (err) {
        console.error('Failed to check permissions:', err);
      }
    };
    checkPermissions();
  }, [api.auth]);

  // Initial fetch
  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [fetchExpenses, fetchStats]);

  // Handle add expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await api.expenses.createExpense({
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference || undefined,
        vendorName: formData.vendorName || undefined,
        vendorContact: formData.vendorContact || undefined,
        budgetCategory: formData.budgetCategory || undefined,
        notes: formData.notes || undefined,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
        isApproved: false,
      });
      
      if (response.success) {
        showNotification('success', 'Expense recorded successfully');
        setShowAddModal(false);
        resetForm();
        fetchExpenses();
        fetchStats();
      } else {
        showNotification('error', response.error || 'Failed to record expense');
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit expense
  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await api.expenses.updateExpense(editingExpense.id, {
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference || undefined,
        vendorName: formData.vendorName || undefined,
        vendorContact: formData.vendorContact || undefined,
        budgetCategory: formData.budgetCategory || undefined,
        notes: formData.notes || undefined,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
      });
      
      if (response.success) {
        showNotification('success', 'Expense updated successfully');
        setShowEditModal(false);
        setEditingExpense(null);
        resetForm();
        fetchExpenses();
        fetchStats();
      } else {
        showNotification('error', response.error || 'Failed to update expense');
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete expense
  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const response = await api.expenses.deleteExpense(id);
      
      if (response.success) {
        showNotification('success', 'Expense deleted successfully');
        fetchExpenses();
        fetchStats();
      } else {
        showNotification('error', response.error || 'Failed to delete expense');
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Handle approve expense
  const handleApproveExpense = async (id: string) => {
    try {
      const response = await api.expenses.approveExpense(id);
      
      if (response.success) {
        showNotification('success', 'Expense approved successfully');
        fetchExpenses();
        fetchStats();
      } else {
        showNotification('error', response.error || 'Failed to approve expense');
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} expenses?`)) return;
    
    const promises = Array.from(selectedIds).map(id => api.expenses.deleteExpense(id));
    await Promise.all(promises);
    
    showNotification('success', `${selectedIds.size} expenses deleted`);
    setSelectedIds(new Set());
    fetchExpenses();
    fetchStats();
  };

  // Handle export
  const handleExport = () => {
    const csv = [
      ['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Vendor', 'Status'].join(','),
      ...filteredExpenses.map(e => [
        e.date,
        `"${e.description}"`,
        e.category,
        e.amount,
        e.paymentMethod,
        e.vendorName || '',
        e.isApproved ? 'Approved' : 'Pending'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'other',
      paymentMethod: 'cash',
      paymentReference: '',
      vendorName: '',
      vendorContact: '',
      budgetCategory: '',
      notes: '',
      isRecurring: false,
      recurringFrequency: '',
    });
  };

  // Open edit modal
  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date,
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      paymentReference: expense.paymentReference || '',
      vendorName: expense.vendorName || '',
      vendorContact: expense.vendorContact || '',
      budgetCategory: expense.budgetCategory || '',
      notes: expense.notes || '',
      isRecurring: expense.isRecurring,
      recurringFrequency: expense.recurringFrequency || '',
    });
    setShowEditModal(true);
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Toggle all
  const toggleAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map(e => e.id)));
    }
  };

  // Filtered expenses (client-side search enhancement)
  const filteredExpenses = useMemo(() => {
    return expenses;
  }, [expenses]);

  // Category chart data
  const categoryChartData = useMemo(() => {
    if (!stats?.categoryTotals) return [];
    return Object.entries(stats.categoryTotals)
      .map(([category, total]) => ({
        name: EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category,
        value: total,
        color: EXPENSE_CATEGORIES.find(c => c.value === category)?.color || '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  // Monthly trend data
  const monthlyTrendData = useMemo(() => {
    const monthMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const month = expense.date.substring(0, 7); // YYYY-MM
      monthMap.set(month, (monthMap.get(month) || 0) + expense.amount);
    });
    
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount: total,
      }));
  }, [expenses]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Header />
      <ErrorBoundary>
        <main className="p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Expenses</h1>
              <p className="text-sm text-stone-500">Track and manage church expenses</p>
            </div>
          </div>
          
          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Total Expenses</p>
              <p className="text-2xl font-bold text-stone-900">
                {formatCurrency(stats?.totalExpenses || 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.approvedExpenses || 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Pending Approval</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(stats?.pendingExpenses || 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">Expense Count</p>
              <p className="text-2xl font-bold text-stone-900">
                {stats?.expenseCount || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200"
        >
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Expenses by Category</h3>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-stone-400">
              No expense data available
            </div>
          )}
        </motion.div>

        {/* Monthly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-stone-200"
        >
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Monthly Expense Trend</h3>
          {monthlyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-stone-400">
              No expense data available
            </div>
          )}
        </motion.div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full sm:w-64"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            {/* Approval Filter */}
            <select
              value={selectedApproval}
              onChange={(e) => setSelectedApproval(e.target.value as any)}
              className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Payment Methods</option>
              {PAYMENT_METHODS.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>

            {/* Date Preset */}
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {canManageExpenses && (
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-shadow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Record Expense
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range */}
        {datePreset === 'custom' && (
          <div className="flex gap-3 mb-6">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Bulk Actions */}
        {selectedIds.size > 0 && canManageExpenses && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-stone-600">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        )}

        {/* Expenses Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-stone-400">No expenses found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  {canManageExpenses && (
                    <th className="text-left py-3 px-4">
                      <button onClick={toggleAll} className="text-stone-400 hover:text-stone-600">
                        {selectedIds.size === expenses.length ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Vendor</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-500">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-stone-500">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => {
                  const category = EXPENSE_CATEGORIES.find(c => c.value === expense.category);
                  return (
                    <tr key={expense.id} className="border-b border-stone-100 hover:bg-stone-50">
                      {canManageExpenses && (
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleSelection(expense.id)}
                            className="text-stone-400 hover:text-stone-600"
                          >
                            {selectedIds.has(expense.id) ? (
                              <CheckSquare className="w-5 h-5 text-amber-500" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3 px-4 text-sm text-stone-600">{formatDate(expense.date)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-stone-900">{expense.description}</div>
                        <div className="text-xs text-stone-500">{expense.paymentMethod}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${category?.color}20`,
                            color: category?.color,
                          }}
                        >
                          {category?.label || expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-600">{expense.vendorName || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-semibold text-stone-900">
                          {formatCurrency(expense.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            expense.isApproved
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {expense.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!expense.isApproved && canManageExpenses && (
                            <button
                              onClick={() => handleApproveExpense(expense.id)}
                              className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {canManageExpenses && (
                            <>
                              <button
                                onClick={() => openEditModal(expense)}
                                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600"
                                title="Edit"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-stone-200">
            <div className="text-sm text-stone-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= totalCount}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-stone-900">Record Expense</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-stone-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Enter expense description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {PAYMENT_METHODS.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Payment Reference
                    </label>
                    <input
                      type="text"
                      value={formData.paymentReference}
                      onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Check #, Transaction ID, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Vendor Name
                    </label>
                    <input
                      type="text"
                      value={formData.vendorName}
                      onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Vendor or payee name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Vendor Contact
                    </label>
                    <input
                      type="text"
                      value={formData.vendorContact}
                      onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Phone, email, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Budget Category
                    </label>
                    <input
                      type="text"
                      value={formData.budgetCategory}
                      onChange={(e) => setFormData({ ...formData, budgetCategory: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Optional budget category"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                        className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-stone-700">Recurring Expense</span>
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={formData.recurringFrequency}
                        onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value })}
                        className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="">Select frequency</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Additional notes or details"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Record Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {showEditModal && editingExpense && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              setEditingExpense(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-stone-900">Edit Expense</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingExpense(null);
                    }}
                    className="p-2 hover:bg-stone-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleEditExpense} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {PAYMENT_METHODS.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Vendor Name
                    </label>
                    <input
                      type="text"
                      value={formData.vendorName}
                      onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingExpense(null);
                    }}
                    className="px-4 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Update Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </main>
      </ErrorBoundary>
    </>
  );
}
