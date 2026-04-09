import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Calendar, Send, Users,
  Edit, Trash2, X, Bell, Megaphone, Mail, AlertCircle, Loader2, CheckCircle2
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { announcementTypeColors, announcementStatusColors } from '../constants/colors';
import { useAnnouncements } from '../hooks/useData';
import { useAPI } from '../contexts/APIContext';
import { useNotification } from '../hooks/useNotification';
import { supabase } from '../services/supabaseClient';
import type { Announcement } from '../services/api';

// Map DB category → display type color key
const categoryColorKey = (category: string): keyof typeof announcementTypeColors => {
  if (category === 'event') return 'event';
  if (category === 'ministry') return 'meeting';
  return 'general';
};

// Map priority → status color key
const priorityToStatus = (priority: string): keyof typeof announcementStatusColors => {
  return priority === 'high' || priority === 'urgent' ? 'published' : 'draft';
};

interface FormState {
  title: string;
  content: string;
  category: string;
  priority: string;
  expiryDate: string;
}

const emptyForm: FormState = {
  title: '',
  content: '',
  category: 'general',
  priority: 'medium',
  expiryDate: '',
};

export default function Announcements() {
  const { api } = useAPI();
  const { show: notify } = useNotification();
  const { data: announcements, isLoading, error } = useAnnouncements();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | number | null>(null);
  const [sendTarget, setSendTarget] = useState<Announcement | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ emails: string[]; copied: boolean } | null>(null);

  const filtered = useMemo(() =>
    announcements.filter(a =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
    ), [announcements, searchQuery]);

  const totalCount = announcements.length;
  const activeCount = announcements.filter(a => a.priority === 'high' || a.priority === 'urgent').length;

  // ── Create ──────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    setShowAddModal(true);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      notify('error', 'Validation', 'Title and content are required');
      return;
    }
    setSaving(true);
    const res = await api.announcements.createAnnouncement({
      title: form.title,
      content: form.content,
      category: form.category,
      priority: form.priority as Announcement['priority'],
      expiryDate: form.expiryDate || undefined,
      authorId: '',
    });
    setSaving(false);
    if (res.success) {
      notify('success', 'Announcement created');
      setShowAddModal(false);
      window.location.reload();
    } else {
      notify('error', 'Error', res.error || 'Failed to create announcement');
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (a: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(a);
    setForm({
      title: a.title,
      content: a.content,
      category: a.category,
      priority: a.priority,
      expiryDate: a.expiryDate || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    if (!form.title.trim() || !form.content.trim()) {
      notify('error', 'Validation', 'Title and content are required');
      return;
    }
    setSaving(true);
    const res = await api.announcements.updateAnnouncement(editTarget.id, {
      title: form.title,
      content: form.content,
      category: form.category,
      priority: form.priority as Announcement['priority'],
      expiryDate: form.expiryDate || undefined,
    });
    setSaving(false);
    if (res.success) {
      notify('success', 'Announcement updated');
      setShowEditModal(false);
      setSelectedAnnouncement(null);
      window.location.reload();
    } else {
      notify('error', 'Error', res.error || 'Failed to update announcement');
    }
  };

  // ── Send to Members ─────────────────────────────────────────────────────────
  const openSend = (a: Announcement, e: React.MouseEvent) => {
    e.stopPropagation();
    setSendTarget(a);
    setSendResult(null);
  };

  const handleSendToMembers = async () => {
    if (!sendTarget) return;
    setSending(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('members')
        .select('email, first_name, last_name')
        .eq('membership_status', 'active');

      if (fetchError) throw fetchError;

      const emails = (data || []).map((m: { email: string }) => m.email).filter(Boolean);

      if (emails.length === 0) {
        notify('error', 'No members', 'No active members found with email addresses');
        setSending(false);
        return;
      }

      const subject = encodeURIComponent(`[Church Announcement] ${sendTarget.title}`);
      const body = encodeURIComponent(
        `${sendTarget.title}\n\n${sendTarget.content}\n\n` +
        (sendTarget.expiryDate ? `Valid until: ${new Date(sendTarget.expiryDate).toLocaleDateString()}\n\n` : '') +
        `Priority: ${sendTarget.priority.toUpperCase()}\nCategory: ${sendTarget.category}`
      );

      // Copy email list to clipboard
      await navigator.clipboard.writeText(emails.join(', '));

      // Open default mail client with BCC to all members
      const bcc = encodeURIComponent(emails.join(','));
      window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, '_blank');

      setSendResult({ emails, copied: true });
      notify('success', 'Email client opened', `Loaded ${emails.length} member emails`);
    } catch (err) {
      notify('error', 'Error', err instanceof Error ? err.message : 'Failed to fetch member emails');
    }
    setSending(false);
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this announcement?')) return;
    setDeleting(id);
    const res = await api.announcements.deleteAnnouncement(id);
    setDeleting(null);
    if (res.success) {
      notify('success', 'Announcement deleted');
      if (selectedAnnouncement?.id === id) setSelectedAnnouncement(null);
      window.location.reload();
    } else {
      notify('error', 'Error', res.error || 'Failed to delete announcement');
    }
  };

  return (
    <>
      <Header />
      <ErrorBoundary>
        <main className="p-6 lg:p-8">
          {/* Page Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-stone-800">Announcements</h1>
                <p className="text-stone-600 mt-1">Manage church communications</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openAdd}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Announcement
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { icon: Megaphone, label: 'Total', value: totalCount, gradient: 'from-amber-400 to-orange-500' },
              { icon: Send, label: 'High Priority', value: activeCount, gradient: 'from-emerald-400 to-teal-500' },
              { icon: Mail, label: 'This Month', value: announcements.filter(a => new Date(a.createdDate).getMonth() === new Date().getMonth()).length, gradient: 'from-blue-400 to-indigo-500' },
              { icon: Users, label: 'Categories', value: new Set(announcements.map(a => a.category)).size, gradient: 'from-rose-400 to-pink-500' },
            ].map(({ icon: Icon, label, value, gradient }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-800">{isLoading ? '—' : value}</p>
                    <p className="text-xs text-stone-500">{label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white/80 backdrop-blur-xl border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </motion.div>

          {/* Loading / Error / List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading announcements...
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No announcements found</p>
              {searchQuery && <p className="text-sm mt-1">Try a different search term</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((announcement, index) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.005 }}
                  onClick={() => setSelectedAnnouncement(announcement)}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-5 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${announcementTypeColors[categoryColorKey(announcement.category)]}`}>
                          {announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${announcementStatusColors[priorityToStatus(announcement.priority)]}`}>
                          {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-stone-800 mb-2">{announcement.title}</h3>
                      <p className="text-sm text-stone-600 line-clamp-2">{announcement.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(announcement.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        {announcement.expiryDate && (
                          <div className="flex items-center gap-1">
                            <Bell className="w-3.5 h-3.5" />
                            Expires {new Date(announcement.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => openSend(announcement, e)}
                        className="p-2 rounded-lg hover:bg-amber-50 transition-colors"
                        title="Send to members"
                      >
                        <Send className="w-4 h-4 text-amber-500" />
                      </button>
                      <button
                        onClick={(e) => openEdit(announcement, e)}
                        className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        <Edit className="w-4 h-4 text-stone-500" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(announcement.id, e)}
                        disabled={deleting === announcement.id}
                        className="p-2 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
                      >
                        {deleting === announcement.id
                          ? <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                          : <Trash2 className="w-4 h-4 text-rose-500" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* View Modal */}
          <AnimatePresence>
            {selectedAnnouncement && !showEditModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedAnnouncement(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${announcementTypeColors[categoryColorKey(selectedAnnouncement.category)]}`}>
                        {selectedAnnouncement.category}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${announcementStatusColors[priorityToStatus(selectedAnnouncement.priority)]}`}>
                        {selectedAnnouncement.priority}
                      </span>
                    </div>
                    <button onClick={() => setSelectedAnnouncement(null)} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
                      <X className="w-5 h-5 text-stone-500" />
                    </button>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-stone-800 mb-3">{selectedAnnouncement.title}</h2>
                  <p className="text-stone-600 mb-4">{selectedAnnouncement.content}</p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      {new Date(selectedAnnouncement.createdDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    {selectedAnnouncement.expiryDate && (
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <Bell className="w-4 h-4 text-stone-400" />
                        Expires {new Date(selectedAnnouncement.expiryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => openEdit(selectedAnnouncement, e)}
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => openSend(selectedAnnouncement, e)}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send to Members
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Send to Members Modal */}
          <AnimatePresence>
            {sendTarget && !showEditModal && !showAddModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => { setSendTarget(null); setSendResult(null); }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-serif font-bold text-stone-800">Send to Members</h2>
                    <button onClick={() => { setSendTarget(null); setSendResult(null); }} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
                      <X className="w-5 h-5 text-stone-500" />
                    </button>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                    <p className="font-semibold text-stone-800 text-sm mb-1">{sendTarget.title}</p>
                    <p className="text-stone-600 text-sm line-clamp-2">{sendTarget.content}</p>
                  </div>

                  {!sendResult ? (
                    <>
                      <p className="text-sm text-stone-600 mb-4">
                        This will fetch all active member emails and open your default email client with the announcement pre-filled. Member emails will also be copied to your clipboard.
                      </p>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-5 text-xs text-blue-700">
                        <strong>Tip:</strong> For automated sending, connect a Supabase Edge Function with Resend or SendGrid. See the <code>supabase/functions/send-announcement</code> scaffold.
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setSendTarget(null); setSendResult(null); }}
                          className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSendToMembers}
                          disabled={sending}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {sending ? 'Fetching members...' : 'Send via Email Client'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-emerald-800 text-sm">Email client opened</p>
                          <p className="text-emerald-700 text-xs mt-0.5">{sendResult.emails.length} member emails loaded as BCC</p>
                        </div>
                      </div>
                      {sendResult.copied && (
                        <p className="text-xs text-stone-500 mb-4 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          Email list also copied to clipboard
                        </p>
                      )}
                      <div className="max-h-32 overflow-y-auto p-3 bg-stone-50 rounded-xl text-xs text-stone-600 font-mono mb-4 space-y-1">
                        {sendResult.emails.map(e => <div key={e}>{e}</div>)}
                      </div>
                      <button
                        onClick={() => { setSendTarget(null); setSendResult(null); }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium"
                      >
                        Done
                      </button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add / Edit Modal */}
          <AnimatePresence>
            {(showAddModal || showEditModal) && (
              <AnnouncementFormModal
                title={showEditModal ? 'Edit Announcement' : 'New Announcement'}
                form={form}
                saving={saving}
                onChange={(field, value) => setForm(prev => ({ ...prev, [field]: value }))}
                onSubmit={showEditModal ? handleUpdate : handleCreate}
                onClose={() => { setShowAddModal(false); setShowEditModal(false); }}
              />
            )}
          </AnimatePresence>
        </main>
      </ErrorBoundary>
    </>
  );
}

// ── Form Modal ───────────────────────────────────────────────────────────────

interface FormModalProps {
  title: string;
  form: FormState;
  saving: boolean;
  onChange: (field: keyof FormState, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function AnnouncementFormModal({ title, form, saving, onChange, onSubmit, onClose }: FormModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif font-bold text-stone-800">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange('title', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              placeholder="Announcement title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Content *</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => onChange('content', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              placeholder="Announcement details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => onChange('category', e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="general">General</option>
                <option value="event">Event</option>
                <option value="ministry">Ministry</option>
                <option value="spiritual">Spiritual</option>
                <option value="urgent">Urgent</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => onChange('priority', e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Expiry Date (optional)</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={(e) => onChange('expiryDate', e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : title === 'New Announcement' ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
