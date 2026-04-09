import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Mail, Phone, MapPin, Calendar,
  MoreHorizontal, X, UserPlus, Trash2, Users, Download,
  Grid3x3, List, ArrowUpDown, Edit, UserCheck, Clock,
  TrendingUp
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import EmptyState from '../components/EmptyState';
import { useVisitors, useCreateMember } from '../hooks/useData';
import { useAPI } from '../hooks/useAPI';
import { useNotification } from '../hooks/useNotification';
import type { Member } from '../services/api';
import { 
  roleOptions, 
  ministryOptions 
} from '../constants/options';
import { CardGridSkeleton } from '../components/LoadingStates';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  visitSource: string;
}

type FollowUpStatus = 'pending' | 'contacted' | 'converted';
type ViewMode = 'card' | 'table';
type SortBy = 'name' | 'joinDate' | 'followUp';
type SortDir = 'asc' | 'desc';

function visitorInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Visitors() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<Member | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [visitorToConvert, setVisitorToConvert] = useState<Member | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortBy, setSortBy] = useState<SortBy>('joinDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showEditModal, setShowEditModal] = useState(false);
  const [visitorToEdit, setVisitorToEdit] = useState<Member | null>(null);
  const [editFormData, setEditFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
    visitSource: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
    visitSource: '',
  });
  const [convertFormData, setConvertFormData] = useState({
    role: 'member',
    ministry: '',
    departments: [] as string[],
    joinDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: visitors, isLoading, refetch } = useVisitors();
  const createMember = useCreateMember();
  const { api } = useAPI();
  const { show: showNotification } = useNotification();

  // Calculate visitor statistics
  const visitorStats = useMemo(() => {
    if (!visitors) return { total: 0, thisMonth: 0, pendingFollowUp: 0, converted: 0 };
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      total: visitors.length,
      thisMonth: visitors.filter(v => new Date(v.joinDate) >= thisMonthStart).length,
      pendingFollowUp: visitors.filter(v => (v as any).followUpStatus === 'pending' || !(v as any).followUpStatus).length,
      converted: visitors.filter(v => (v as any).followUpStatus === 'converted').length,
    };
  }, [visitors]);

  // Sort and filter visitors
  const sortedAndFilteredVisitors = useMemo(() => {
    if (!visitors) return [];
    
    let result = visitors;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(visitor =>
        visitor.name.toLowerCase().includes(query) ||
        visitor.email.toLowerCase().includes(query) ||
        visitor.phone.toLowerCase().includes(query)
      );
    }
    
    // Sort
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'joinDate') {
        cmp = new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
      } else if (sortBy === 'followUp') {
        const aStatus = (a as any).followUpStatus || 'pending';
        const bStatus = (b as any).followUpStatus || 'pending';
        cmp = aStatus.localeCompare(bStatus);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    
    return sorted;
  }, [visitors, searchQuery, sortBy, sortDir]);

  const handleAddVisitor = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('First name, last name, and email are required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if email already exists in visitors list
    if (visitors && visitors.some(v => v.email.toLowerCase() === formData.email.toLowerCase())) {
      setError('This email address is already in the system. Please use a different email.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const visitorData = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        status: 'new' as const,
        role: 'visitor',
        primaryMinistry: '',
        joinDate: new Date().toISOString().split('T')[0],
        dateOfBirth: formData.dateOfBirth || '',
        departments: [],
        education: '',
        hometown: '',
        emergencyContact: {
          name: '',
          phone: '',
          relationship: '',
        },
        notes: formData.notes,
        profileImageUrl: '',
        address: `${formData.address} ${formData.city} ${formData.state} ${formData.zipCode}`.trim(),
      };

      const result = await createMember.create(visitorData);

      if (result && result.id) {
        showNotification('success', 'Visitor added successfully');
        setShowAddModal(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          notes: '',
          visitSource: '',
        });
        refetch();
      } else {
        // Check hook error state for detailed message
        let errorMsg = createMember.error || 'Failed to add visitor';
        
        // Parse and improve error message for duplicate email
        if (errorMsg.includes('duplicate key') || errorMsg.includes('23505')) {
          errorMsg = 'This email address is already registered in the system. Please use a different email.';
        }
        
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add visitor';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditVisitor = (visitor: Member) => {
    const parts = visitor.name.trim().split(/\s+/);
    setEditFormData({
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      email: visitor.email,
      phone: visitor.phone,
      dateOfBirth: visitor.dateOfBirth || '',
      address: visitor.address || '',
      city: '',
      state: '',
      zipCode: '',
      notes: visitor.notes || '',
      visitSource: (visitor as any).visitSource || '',
    });
    setVisitorToEdit(visitor);
    setShowEditModal(true);
    setSelectedVisitor(null);
  };

  const handleEditVisitor = async () => {
    if (!visitorToEdit) return;
    if (!editFormData.firstName || !editFormData.lastName || !editFormData.email) {
      setEditError('First name, last name, and email are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email)) {
      setEditError('Please enter a valid email address');
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const updateData = {
        name: `${editFormData.firstName} ${editFormData.lastName}`,
        email: editFormData.email,
        phone: editFormData.phone,
        dateOfBirth: editFormData.dateOfBirth || undefined,
        address: editFormData.address,
        notes: editFormData.notes,
      };

      const result = await api.members.updateMember(visitorToEdit.id, updateData);

      if (result.success) {
        showNotification('success', 'Visitor updated successfully');
        setShowEditModal(false);
        setVisitorToEdit(null);
        refetch();
      } else {
        setEditError(result.error || 'Failed to update visitor');
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update visitor');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleUpdateFollowUpStatus = async (visitor: Member, status: FollowUpStatus) => {
    try {
      const result = await api.members.updateMember(visitor.id, { 
        notes: `${visitor.notes || ''}\n[Follow-up: ${status}]`
      } as any);
      if (result.success) {
        showNotification('success', `Follow-up status updated to ${status}`);
        refetch();
      } else {
        showNotification('error', 'Failed to update follow-up status');
      }
    } catch {
      showNotification('error', 'Failed to update follow-up status');
    }
    setSelectedVisitor(null);
  };

  const exportVisitorsToCSV = useCallback(() => {
    if (!sortedAndFilteredVisitors.length) return;
    
    const header = ['Name', 'Email', 'Phone', 'Join Date', 'Address', 'Notes'];
    const rows = sortedAndFilteredVisitors.map(v => [
      v.name,
      v.email,
      v.phone,
      v.joinDate,
      v.address || '',
      v.notes || '',
    ]);
    
    const csv = [header.join(','), ...rows.map(r => r.map(v => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitors_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sortedAndFilteredVisitors]);

  const handleConvertToMember = async () => {
    if (!visitorToConvert) return;

    setSubmitting(true);
    setError(null);

    try {
      const updateData = {
        status: 'active' as const,
        role: convertFormData.role,
        primaryMinistry: convertFormData.ministry,
        departments: convertFormData.departments,
        joinDate: convertFormData.joinDate,
      };

      const result = await api.members.updateMember(visitorToConvert.id, updateData);

      if (result.success) {
        showNotification('success', 'Visitor converted successfully');
        setShowConvertModal(false);
        setVisitorToConvert(null);
        refetch();
      } else {
        setError(result.error || 'Failed to convert visitor');
      }
    } catch {
      setError('Failed to convert visitor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVisitor = async (visitor: Member) => {
    if (!confirm(`Are you sure you want to delete ${visitor.name}?`)) return;

    try {
      const result = await api.members.deleteMember(visitor.id);
      if (result.success) {
        showNotification('success', 'Visitor deleted successfully');
        refetch();
      } else {
        showNotification('error', 'Failed to delete visitor');
      }
    } catch {
      showNotification('error', 'Failed to delete visitor');
    }
  };

  const toggleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDir('asc');
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-serif font-bold text-stone-900 mb-2">Visitors</h1>
            <p className="text-stone-600">Track and manage church visitors</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-stone-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{visitorStats.total}</p>
                  <p className="text-sm text-stone-500">Total Visitors</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-stone-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{visitorStats.thisMonth}</p>
                  <p className="text-sm text-stone-500">This Month</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-stone-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{visitorStats.pendingFollowUp}</p>
                  <p className="text-sm text-stone-500">Pending Follow-up</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-stone-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{visitorStats.converted}</p>
                  <p className="text-sm text-stone-500">Converted</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Search and Actions */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search visitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex bg-white rounded-lg border border-stone-200 p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'card' ? 'bg-amber-100 text-amber-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-amber-100 text-amber-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Button */}
              <button
                onClick={() => toggleSort('joinDate')}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="text-sm">Sort</span>
              </button>

              {/* Export Button */}
              <button
                onClick={exportVisitorsToCSV}
                disabled={!sortedAndFilteredVisitors.length}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Export</span>
              </button>

              {/* Add Visitor Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4" />
                Add Visitor
              </button>
            </div>
          </div>

          {/* Visitors Grid */}
          {isLoading ? (
            <CardGridSkeleton count={6} />
          ) : sortedAndFilteredVisitors.length === 0 ? (
            <EmptyState
              icon="users"
              title={searchQuery ? 'No visitors found' : 'No visitors yet'}
              description={
                searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Start by adding your first church visitor'
              }
              action={
                !searchQuery ? {
                  label: 'Add First Visitor',
                  onClick: () => setShowAddModal(true)
                } : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedAndFilteredVisitors.map((visitor) => (
                <motion.div
                  key={visitor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-stone-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {visitorInitials(visitor.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{visitor.name}</h3>
                        <p className="text-sm text-stone-500">Visitor</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setSelectedVisitor(selectedVisitor?.id === visitor.id ? null : visitor)}
                        className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-stone-400" />
                      </button>
                      {selectedVisitor?.id === visitor.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-stone-200 py-2 z-10">
                          <button
                            onClick={() => openEditVisitor(visitor)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setVisitorToConvert(visitor);
                              setShowConvertModal(true);
                              setSelectedVisitor(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            Convert to Member
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteVisitor(visitor);
                              setSelectedVisitor(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Mail className="w-4 h-4" />
                      {visitor.email}
                    </div>
                    {visitor.phone && (
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <Phone className="w-4 h-4" />
                        {visitor.phone}
                      </div>
                    )}
                    {visitor.address && (
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <MapPin className="w-4 h-4" />
                        {visitor.address}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Calendar className="w-4 h-4" />
                      Joined {new Date(visitor.joinDate).toLocaleDateString()}
                    </div>
                    {visitor.notes && (
                      <p className="text-xs text-stone-500 line-clamp-2 mt-2">{visitor.notes}</p>
                    )}
                  </div>

                  {/* Follow-up Status */}
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <label className="block text-xs font-medium text-stone-500 mb-2">Follow-up Status</label>
                    <select
                      value={(visitor as any).followUpStatus || 'pending'}
                      onChange={(e) => handleUpdateFollowUpStatus(visitor, e.target.value as FollowUpStatus)}
                      className={`w-full px-3 py-1.5 text-sm rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                        (visitor as any).followUpStatus === 'converted' 
                          ? 'bg-green-50 text-green-700'
                          : (visitor as any).followUpStatus === 'contacted'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                    </select>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Add Visitor Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-stone-900">Add New Visitor</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Any additional notes about this visitor..."
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddVisitor}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Adding...' : 'Add Visitor'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Convert to Member Modal */}
        <AnimatePresence>
          {showConvertModal && visitorToConvert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-stone-900">Convert to Member</h2>
                  <button
                    onClick={() => setShowConvertModal(false)}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-stone-600">
                    Convert <span className="font-semibold">{visitorToConvert.name}</span> from visitor to full member?
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Role
                    </label>
                    <select
                      value={convertFormData.role}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {roleOptions.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Primary Ministry
                    </label>
                    <select
                      value={convertFormData.ministry}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, ministry: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select ministry</option>
                      {ministryOptions.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Join Date
                    </label>
                    <input
                      type="date"
                      value={convertFormData.joinDate}
                      onChange={(e) => setConvertFormData(prev => ({ ...prev, joinDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowConvertModal(false)}
                      className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConvertToMember}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50"
                    >
                      Convert to Member
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Visitor Modal */}
        <AnimatePresence>
          {showEditModal && visitorToEdit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-stone-900">Edit Visitor</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={editFormData.firstName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={editFormData.lastName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editFormData.dateOfBirth}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Any additional notes about this visitor..."
                    />
                  </div>

                  {editError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{editError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEditVisitor}
                      disabled={editSubmitting}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50"
                    >
                      {editSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}