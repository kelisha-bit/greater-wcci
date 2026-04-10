import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Phone, MapPin, Cake, Edit2, ChevronRight, MessageCircle,
  AlertTriangle, Gift, Check, X, Loader2, Camera, User,
  Briefcase, Home, Heart, BookOpen, Shield, Calendar,
  Activity, TrendingUp, Clock, DollarSign, CheckCircle2,
  XCircle, MinusCircle, LayoutGrid, Award, Users, Target,
  Fingerprint, NotebookText, Percent, Wallet,
} from 'lucide-react';
import { formatDistanceToNow, differenceInYears, parseISO, isValid } from 'date-fns';
import { ministryColors } from '../constants/colors';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { useCurrentUserProfile, useMember } from '../hooks/useData';
import { useNavigate, useParams } from 'react-router-dom';
import { getMemberStatusConfig } from '../constants/statusConfig';
import { useAuth } from '../contexts/AuthContext';
import { membersApi, donationsApi, attendanceApi, eventsApi } from '../services/api';
import type { Member, Donation, Attendance, Event } from '../services/api';
//  Editable field ─
interface EditableFieldProps {
  label: string;
  value: string;
  icon: React.ElementType;
  type?: 'text' | 'email' | 'tel' | 'date' | 'select';
  options?: string[];
  canEdit: boolean;
  onSave: (value: string) => Promise<void>;
}

function EditableField({ label, value, icon: Icon, type = 'text', options, canEdit, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-white to-stone-50/50 rounded-xl group hover:shadow-md transition-all duration-300 border border-stone-100">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
        <Icon className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-stone-500 mb-1 uppercase tracking-wide">{label}</p>
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div key="edit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-2">
              {type === 'select' && options ? (
                <select ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
                  className="flex-1 text-sm bg-white border-2 border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm">
                  {options.map(o => <option key={o} value={o}>{o || ''}</option>)}
                </select>
              ) : (
                <input ref={inputRef} type={type} value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                  className="flex-1 text-sm bg-white border-2 border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm" />
              )}
              <button type="button" onClick={commit} disabled={saving} className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button type="button" onClick={cancel} className="p-2 rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 transition-colors shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <p className="text-sm font-semibold text-stone-800 break-all">
                {value ? value : <span className="text-stone-400 font-normal italic">Not provided</span>}
              </p>
              {canEdit && (
                <button type="button" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-amber-100 transition-all shrink-0">
                  <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

//  Tab — segmented control with shared layout highlight
function Tab({ label, icon: Icon, active, onClick }: { label: string; icon: React.ElementType; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} role="tab" aria-selected={active}
      className={`relative z-10 flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${active ? 'text-white' : 'text-stone-600 hover:text-stone-900'}`}>
      <Icon className="w-4 h-4 opacity-90" />
      {label}
      {active && (
        <motion.span layoutId="profileTabPill" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25" transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }} />
      )}
    </button>
  );
}

function SectionCard({
  title,
  icon: Icon,
  iconClass = 'text-amber-600',
  iconBg = 'from-amber-100 to-orange-100',
  accent = 'amber',
  children,
  className = '',
}: {
  title: string;
  icon: React.ElementType;
  iconClass?: string;
  iconBg?: string;
  accent?: 'amber' | 'blue' | 'purple' | 'emerald' | 'rose';
  children: React.ReactNode;
  className?: string;
}) {
  const accentBar: Record<typeof accent, string> = {
    amber: 'bg-gradient-to-b from-amber-400 to-orange-500',
    blue: 'bg-gradient-to-b from-blue-400 to-indigo-500',
    purple: 'bg-gradient-to-b from-violet-400 to-purple-600',
    emerald: 'bg-gradient-to-b from-emerald-400 to-teal-500',
    rose: 'bg-gradient-to-b from-rose-400 to-pink-500',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white/95 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_32px_-8px_rgba(28,25,23,0.08)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_12px_40px_-12px_rgba(28,25,23,0.12)] ${className}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accentBar[accent]}`} aria-hidden />
      <div className="p-6 sm:p-7 pl-7 sm:pl-8">
        <h3 className="mb-5 flex items-center gap-3 border-b border-stone-100 pb-4 text-sm font-bold uppercase tracking-wider text-stone-700">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconClass}`} />
          </span>
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

//  Activity hook 
function useActivityHistory(memberId: string | null) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [donRes, attRes, evtRes] = await Promise.all([
          donationsApi.getDonations({ donorId: memberId, pageSize: 10 }),
          attendanceApi.getAttendanceRecords({ memberId, pageSize: 15 } as Record<string, unknown>),
          eventsApi.getEvents({ limit: 8 }),
        ]);
        if (cancelled) return;
        if (donRes.success && donRes.data) setDonations(donRes.data);
        if (attRes.success && attRes.data) setAttendance(attRes.data);
        if (evtRes.success && evtRes.data) setEvents(evtRes.data);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  return { donations, attendance, events, loading };
}
//  Main component ─
export default function Profile() {
  const navigate = useNavigate();
  const { isAdminOrStaff, refreshProfile } = useAuth();
  const params = useParams();
  const memberId = params.id ?? null;
  const currentUserProfile = useCurrentUserProfile();
  const memberProfileById = useMember(memberId);
  const { data: memberProfile, isLoading, error } = memberId ? memberProfileById : currentUserProfile;

  const [local, setLocal] = useState<Member | null>(null);
  const [tab, setTab] = useState<'overview' | 'personal' | 'ministry' | 'activity'>('overview');
  const [imageError, setImageError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (memberProfile) setLocal(memberProfile); }, [memberProfile]);
  useEffect(() => { setImageError(false); }, [local?.profileImageUrl]);

  const canEdit = !memberId && isAdminOrStaff;
  const { donations, attendance, events, loading: activityLoading } = useActivityHistory(local?.id ?? null);

  const save = async (updates: Partial<Member>) => {
    if (!local) return;
    setSaveError(null);
    const res = await membersApi.updateMember(local.id, updates);
    if (res.success && res.data) {
      setLocal(prev => prev ? { ...prev, ...updates } : prev);
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } else {
      setSaveError(res.error || 'Failed to save');
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !local) return;
    setPhotoUploading(true);
    const res = await membersApi.uploadAndSetProfilePhoto(local.id, file);
    if (res.success && res.data) { setLocal(res.data); await refreshProfile(); }
    else setSaveError(res.error || 'Upload failed');
    setPhotoUploading(false);
    e.target.value = '';
  };

  if (isLoading) return (
    <><Header /><main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/25 to-white p-6 lg:p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-amber-500/10 ring-1 ring-stone-200/80">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
        <p className="font-medium text-stone-700">Loading profile</p>
        <p className="mt-1 text-sm text-stone-500">Fetching your details…</p>
      </div>
    </main></>
  );

  if (error || !local) return (
    <><Header /><main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-50 to-white p-6 lg:p-8">
      <div className="max-w-md rounded-2xl border border-stone-200/80 bg-white/90 p-10 text-center shadow-xl shadow-stone-200/40 backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <h2 className="font-serif text-xl font-semibold text-stone-900">Profile not found</h2>
        <p className="mt-2 text-sm text-stone-500">{error || 'No data available'}</p>
      </div>
    </main></>
  );

  const name = local.name || 'Unknown';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const statusConfig = getMemberStatusConfig(local.status || 'pending');
  const gradient = (ministryColors as Record<string, string>)[local.primaryMinistry ?? ''] || 'from-amber-400 to-orange-500';

  const joinParsed = local.joinDate ? parseISO(local.joinDate) : null;
  const tenureYears = joinParsed && isValid(joinParsed) ? differenceInYears(new Date(), joinParsed) : null;
  const tenureLabel = tenureYears != null && tenureYears >= 0
    ? (tenureYears === 0 ? 'Joined this year' : `${tenureYears} year${tenureYears === 1 ? '' : 's'} with us`)
    : null;
  const donationTotal = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const presentRecorded = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = attendance.length ? Math.round((presentRecorded / attendance.length) * 100) : null;
  const locationLine = [local.city, local.state].filter(Boolean).join(', ') || null;
  const subtitleText = [local.occupation?.trim(), locationLine].filter(Boolean).join(' · ') || null;

  return (
    <><Header />
    <ErrorBoundary>
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/20 to-white">

      {/* Breadcrumb below app header — keeps trail out of the hero so it cannot clash with the profile title */}
      <nav aria-label="Breadcrumb" className="relative z-10 border-b border-stone-200/50 bg-white/70 px-6 py-3 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2 text-sm text-stone-600">
          <button type="button" onClick={() => navigate('/members')} className="rounded-lg px-2 py-1 font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-800">Members</button>
          <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
          <span className="font-semibold text-stone-900">{memberId ? 'Member profile' : 'My profile'}</span>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-stone-200/80 bg-stone-50/90 px-3 py-1 text-xs font-medium text-stone-500 sm:flex">
            <Fingerprint className="h-3.5 w-3.5 text-amber-600" aria-hidden />
            ID {local.id.slice(0, 8)}…
          </span>
        </div>
      </nav>

      {/*  Hero cover — layered depth + mesh  */}
      <div className={`relative mt-0 min-h-[13rem] overflow-hidden sm:h-64 sm:min-h-0 bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(255,255,255,0.25),transparent)]" />
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI0YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-25" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-stone-50 via-stone-50/70 to-transparent" />
        {/* save toast */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-4 right-6 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-sm text-emerald-700 shadow">
              <Check className="w-4 h-4" /> Saved
            </motion.div>
          )}
          {saveError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-4 right-6 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-sm text-rose-700 shadow">
              <AlertTriangle className="w-4 h-4" /> {saveError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-12 lg:px-8">
        {/*  Avatar row — z-10 so title/avatar sit above the hero when overlapping; min-w-0 avoids long names colliding with actions */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-20 mb-8">
          <div className="flex min-w-0 flex-1 items-end gap-5">
            {/* avatar */}
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.4 }} className="relative shrink-0 group">
              <div className={`w-36 h-36 rounded-3xl bg-gradient-to-br ${gradient} border-4 border-white shadow-2xl flex items-center justify-center text-white font-bold text-4xl overflow-hidden ring-4 ring-amber-100/50`}>
                {local.profileImageUrl && !imageError
                  ? <img src={local.profileImageUrl} alt={name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
                  : initials}
              </div>
              {canEdit && (
                <>
                  <button type="button" onClick={() => photoRef.current?.click()} disabled={photoUploading}
                    className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/60 to-black/20 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300">
                    {photoUploading ? <Loader2 className="w-7 h-7 text-white animate-spin" /> : (
                      <>
                        <Camera className="w-7 h-7 text-white mb-1" />
                        <span className="text-xs text-white font-medium">Change Photo</span>
                      </>
                    )}
                  </button>
                  <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
                </>
              )}
              <div className={`absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white shadow-lg ${
                local.status === 'active' ? 'bg-gradient-to-br from-emerald-400 to-teal-600' :
                local.status === 'inactive' ? 'bg-gradient-to-br from-stone-400 to-stone-700' :
                'bg-gradient-to-br from-amber-400 to-orange-500'
              }`}>
                {(() => {
                  const Corner = statusConfig.icon;
                  return <Corner className="h-5 w-5 text-white" aria-hidden />;
                })()}
              </div>
            </motion.div>
            {/* name block */}
            <div className="min-w-0 pb-2">
              <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="scroll-mt-20 break-words font-serif text-3xl font-bold tracking-tight text-stone-900 lg:text-4xl">{name}</motion.h1>
              {subtitleText && (
                <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }} className="mt-1.5 max-w-xl text-sm font-medium text-stone-600 md:text-base">
                  {subtitleText}
                </motion.p>
              )}
              <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.14 }} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                {tenureLabel && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                    {tenureLabel}
                  </span>
                )}
                {local.createdAt && isValid(parseISO(local.createdAt)) && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                    Profile record from {new Date(local.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </motion.p>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mt-3 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-lg text-sm font-medium text-stone-700 shadow-sm border border-stone-200 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  {local.role || 'Member'}
                </span>
                {local.primaryMinistry && (
                  <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-lg text-sm font-medium text-stone-700 shadow-sm border border-stone-200 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-600" />
                    {local.primaryMinistry}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-sm ${statusConfig.bg} ${statusConfig.color} border border-current/20`}>{statusConfig.label}</span>
              </motion.div>
            </div>
          </div>
          {/* action buttons */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex gap-3 pb-2">
            {memberId && (
              <button onClick={() => navigate('/members')} className="px-5 py-2.5 rounded-xl border-2 border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm hover:shadow flex items-center gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back
              </button>
            )}
            <button disabled className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold opacity-50 cursor-not-allowed flex items-center gap-2 shadow-lg">
              <MessageCircle className="w-4 h-4" /> Message
            </button>
          </motion.div>
        </div>

        {/*  Quick stats — richer metrics  */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Member since',
              value: local.joinDate ? new Date(local.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
              hint: tenureLabel || 'Join date not set',
              icon: Calendar,
              color: 'text-blue-600',
              bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
              border: 'border-blue-200/80',
            },
            {
              label: 'Total giving',
              value: donations.length ? `GH₵ ${donationTotal.toLocaleString()}` : '—',
              hint: donations.length ? `${donations.length} recorded gift${donations.length === 1 ? '' : 's'}` : 'No gifts in recent history',
              icon: Wallet,
              color: 'text-emerald-600',
              bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
              border: 'border-emerald-200/80',
            },
            {
              label: 'Attendance',
              value: attendance.length ? `${attendanceRate ?? 0}%` : '—',
              hint: attendance.length
                ? `${presentRecorded} present of ${attendance.length} logged`
                : 'No attendance logged yet',
              icon: Percent,
              color: 'text-amber-600',
              bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
              border: 'border-amber-200/80',
            },
            {
              label: 'Ministries',
              value: local.ministries?.length ? String(local.ministries.length) : '0',
              hint: local.primaryMinistry ? `Primary · ${local.primaryMinistry}` : 'Not assigned to a primary ministry',
              icon: Gift,
              color: 'text-purple-600',
              bg: 'bg-gradient-to-br from-purple-50 to-violet-50',
              border: 'border-purple-200/80',
            },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.45 + i * 0.06 }}
              className={`group relative overflow-hidden rounded-2xl border ${s.border} bg-white/95 p-5 shadow-[0_8px_30px_-12px_rgba(28,25,23,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(28,25,23,0.18)]`}
            >
              <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${s.bg} opacity-60 blur-2xl transition-opacity group-hover:opacity-90`} aria-hidden />
              <div className="relative flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.bg} shadow-sm ring-1 ring-white/80 transition-transform duration-300 group-hover:scale-105`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500">{s.label}</p>
                  <p className="truncate text-lg font-bold tracking-tight text-stone-900">{s.value}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-stone-500">{s.hint}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/*  Tabs — scroll on narrow viewports  */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="relative mb-8 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-full gap-1 rounded-2xl border border-stone-200/80 bg-stone-100/80 p-1.5 shadow-inner sm:min-w-0">
            <Tab label="Overview" icon={LayoutGrid} active={tab === 'overview'} onClick={() => setTab('overview')} />
            <Tab label="Personal" icon={User} active={tab === 'personal'} onClick={() => setTab('personal')} />
            <Tab label="Ministry" icon={Gift} active={tab === 'ministry'} onClick={() => setTab('ministry')} />
            <Tab label="Activity" icon={Activity} active={tab === 'activity'} onClick={() => setTab('activity')} />
          </div>
        </motion.div>
        {/* Tab panels */}
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }}>
                <SectionCard title="Contact" icon={Mail} accent="amber" iconBg="from-amber-100 to-orange-100" iconClass="text-amber-600">
                  <div className="space-y-3">
                    <EditableField label="Email" value={local.email || ''} icon={Mail} type="email" canEdit={canEdit} onSave={v => save({ email: v })} />
                    <EditableField label="Phone" value={local.phone || ''} icon={Phone} type="tel" canEdit={canEdit} onSave={v => save({ phone: v })} />
                    <EditableField label="Address" value={local.address || ''} icon={MapPin} canEdit={canEdit} onSave={v => save({ address: v })} />
                    <EditableField label="City" value={local.city || ''} icon={Home} canEdit={canEdit} onSave={v => save({ city: v })} />
                  </div>
                </SectionCard>
              </motion.div>
              <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                <SectionCard title="About you" icon={User} accent="blue" iconBg="from-blue-100 to-indigo-100" iconClass="text-blue-600">
                  {local.baptismStatus?.trim() && (
                    <div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600/90">Baptism</p>
                      <p className="mt-0.5 text-sm font-semibold text-stone-800">{local.baptismStatus}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <EditableField label="Date of Birth" value={local.dateOfBirth || ''} icon={Cake} type="date" canEdit={canEdit} onSave={v => save({ dateOfBirth: v })} />
                    <EditableField label="Occupation" value={local.occupation || ''} icon={Briefcase} canEdit={canEdit} onSave={v => save({ occupation: v })} />
                    <EditableField label="Hometown" value={local.hometown || ''} icon={Home} canEdit={canEdit} onSave={v => save({ hometown: v })} />
                    <EditableField label="Marital Status" value={local.maritalStatus || ''} icon={Heart} type="select" options={['', 'Single', 'Married', 'Divorced', 'Widowed']} canEdit={canEdit} onSave={v => save({ maritalStatus: v })} />
                  </div>
                </SectionCard>
              </motion.div>
              <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }} className="lg:col-span-2">
                <SectionCard title="Ministry involvement" icon={Gift} accent="purple" iconBg="from-purple-100 to-violet-100" iconClass="text-purple-600">
                  {local.ministries?.length ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {local.ministries.map((m, i) => {
                        const hues = ['from-violet-500/90 to-purple-600', 'from-amber-500/90 to-orange-600', 'from-emerald-500/90 to-teal-600', 'from-sky-500/90 to-blue-600', 'from-rose-500/90 to-pink-600'];
                        const bar = hues[i % hues.length];
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.08 + i * 0.04 }}
                            className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-b from-white to-stone-50/80 shadow-sm transition-all duration-300 hover:border-purple-200 hover:shadow-md"
                          >
                            <div className={`h-1.5 bg-gradient-to-r ${bar}`} />
                            <div className="p-4">
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-100 transition-transform group-hover:scale-105">
                                  <Users className="h-5 w-5" />
                                </div>
                                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">{m.role.charAt(0).toUpperCase() + m.role.slice(1)}</span>
                              </div>
                              <p className="mb-1 text-sm font-bold text-stone-900">{m.ministryName}</p>
                              <p className="text-xs text-stone-500">Joined {new Date(m.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 py-14 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 shadow-inner">
                        <Gift className="h-8 w-8 text-stone-300" />
                      </div>
                      <p className="text-sm font-semibold text-stone-700">No ministry teams yet</p>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500">When you are added to a ministry, it will show here with role and start date.</p>
                    </div>
                  )}
                </SectionCard>
              </motion.div>
              {local.notes?.trim() && (
                <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.18 }} className="lg:col-span-2">
                  <SectionCard title="Notes on file" icon={NotebookText} accent="amber" iconBg="from-amber-50 to-orange-50" iconClass="text-amber-700">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{local.notes.trim()}</p>
                  </SectionCard>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* PERSONAL */}
          {tab === 'personal' && (
            <motion.div key="personal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionCard title="Personal details" icon={User} accent="blue" iconBg="from-blue-100 to-indigo-100" iconClass="text-blue-600">
                <div className="space-y-3">
                  <EditableField label="Date of Birth" value={local.dateOfBirth || ''} icon={Cake} type="date" canEdit={canEdit} onSave={v => save({ dateOfBirth: v })} />
                  <EditableField label="Hometown" value={local.hometown || ''} icon={Home} canEdit={canEdit} onSave={v => save({ hometown: v })} />
                  <EditableField label="Occupation" value={local.occupation || ''} icon={Briefcase} canEdit={canEdit} onSave={v => save({ occupation: v })} />
                  <EditableField label="Education" value={local.education || ''} icon={BookOpen} canEdit={canEdit} onSave={v => save({ education: v })} />
                  <EditableField label="Marital Status" value={local.maritalStatus || ''} icon={Heart} type="select" options={['', 'Single', 'Married', 'Divorced', 'Widowed']} canEdit={canEdit} onSave={v => save({ maritalStatus: v })} />
                </div>
              </SectionCard>
              <SectionCard title="Emergency contact" icon={Shield} accent="amber" iconBg="from-amber-100 to-orange-100" iconClass="text-amber-700">
                <div className="space-y-3">
                  <EditableField label="Name" value={local.emergencyContact?.name || ''} icon={User} canEdit={canEdit} onSave={v => save({ emergencyContact: { ...local.emergencyContact, name: v, phone: local.emergencyContact?.phone || '', relationship: local.emergencyContact?.relationship || '' } })} />
                  <EditableField label="Phone" value={local.emergencyContact?.phone || ''} icon={Phone} type="tel" canEdit={canEdit} onSave={v => save({ emergencyContact: { ...local.emergencyContact, name: local.emergencyContact?.name || '', phone: v, relationship: local.emergencyContact?.relationship || '' } })} />
                  <EditableField label="Relationship" value={local.emergencyContact?.relationship || ''} icon={Heart} type="select" options={['', 'Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']} canEdit={canEdit} onSave={v => save({ emergencyContact: { ...local.emergencyContact, name: local.emergencyContact?.name || '', phone: local.emergencyContact?.phone || '', relationship: v } })} />
                </div>
              </SectionCard>
              <SectionCard title="Contact & location" icon={Mail} accent="amber" iconBg="from-amber-100 to-orange-100" iconClass="text-amber-600" className="lg:col-span-2">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <EditableField label="Email" value={local.email || ''} icon={Mail} type="email" canEdit={canEdit} onSave={v => save({ email: v })} />
                  <EditableField label="Phone" value={local.phone || ''} icon={Phone} type="tel" canEdit={canEdit} onSave={v => save({ phone: v })} />
                  <EditableField label="Address" value={local.address || ''} icon={MapPin} canEdit={canEdit} onSave={v => save({ address: v })} />
                  <EditableField label="City" value={local.city || ''} icon={Home} canEdit={canEdit} onSave={v => save({ city: v })} />
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* MINISTRY */}
          {tab === 'ministry' && (
            <motion.div key="ministry" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <SectionCard title="Ministry groups" icon={Gift} accent="purple" iconBg="from-purple-100 to-violet-100" iconClass="text-purple-600">
                {local.ministries?.length ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {local.ministries.map((m, i) => {
                      const colors = ['from-amber-400 to-orange-500', 'from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-rose-400 to-pink-500', 'from-purple-400 to-violet-500'];
                      const c = colors[i % colors.length];
                      return (
                        <div key={m.id} className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                          <div className={`h-2 bg-gradient-to-r ${c}`} />
                          <div className="p-4">
                            <p className="font-semibold text-stone-800">{m.ministryName}</p>
                            <p className="mt-1 text-xs text-stone-500">{m.role.charAt(0).toUpperCase() + m.role.slice(1)}</p>
                            <p className="mt-0.5 text-xs text-stone-400">Joined {new Date(m.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-200 py-12 text-center">
                    <Gift className="mx-auto mb-3 h-10 w-10 text-stone-200" />
                    <p className="text-sm text-stone-500">Not linked to any ministries yet.</p>
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Role & assignment" icon={TrendingUp} accent="amber" iconBg="from-amber-100 to-orange-100" iconClass="text-amber-600">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <EditableField label="Church Role" value={local.role || ''} icon={User} canEdit={canEdit} onSave={v => save({ role: v })} />
                  <EditableField label="Primary Ministry" value={local.primaryMinistry || ''} icon={Gift} canEdit={canEdit} onSave={v => save({ primaryMinistry: v })} />
                  <EditableField label="Join Date" value={local.joinDate || ''} icon={Calendar} type="date" canEdit={canEdit} onSave={v => save({ joinDate: v })} />
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ACTIVITY */}
          {tab === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionCard title="Recent donations" icon={Wallet} accent="emerald" iconBg="from-emerald-100 to-teal-100" iconClass="text-emerald-700">
                {activityLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-100" />)}</div>
                ) : donations.length === 0 ? (
                  <div className="py-10 text-center">
                    <Wallet className="mx-auto mb-2 h-9 w-9 text-stone-200" />
                    <p className="text-sm text-stone-500">No donation records in recent history.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {donations.map(d => (
                      <div key={d.id} className="flex items-center gap-3 rounded-xl border border-transparent bg-stone-50/90 p-3 transition-all hover:border-emerald-200/80 hover:bg-emerald-50/40">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 ring-1 ring-emerald-200/50">
                          <DollarSign className="h-4 w-4 text-emerald-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-stone-900">GH&#8373; {d.amount.toLocaleString()}</p>
                          <p className="text-xs text-stone-500">{d.fundType} · {new Date(d.date).toLocaleDateString()}</p>
                        </div>
                        <span className="shrink-0 text-xs text-stone-400">{formatDistanceToNow(new Date(d.date), { addSuffix: true })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Attendance history" icon={Clock} accent="blue" iconBg="from-sky-100 to-blue-100" iconClass="text-blue-700">
                {activityLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-100" />)}</div>
                ) : attendance.length === 0 ? (
                  <div className="py-10 text-center">
                    <Clock className="mx-auto mb-2 h-9 w-9 text-stone-200" />
                    <p className="text-sm text-stone-500">No attendance records found.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attendance.map(a => {
                      const Icon = a.status === 'present' ? CheckCircle2 : a.status === 'absent' ? XCircle : MinusCircle;
                      const color = a.status === 'present' ? 'text-emerald-600' : a.status === 'absent' ? 'text-rose-600' : 'text-amber-600';
                      const bg = a.status === 'present' ? 'bg-emerald-50' : a.status === 'absent' ? 'bg-rose-50' : 'bg-amber-50';
                      return (
                        <div key={a.id} className="flex items-center gap-3 rounded-xl border border-transparent bg-stone-50/90 p-3 transition-all hover:border-stone-200 hover:bg-white">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ring-1 ring-black/[0.04]`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-stone-900">{a.eventName || 'Service'}</p>
                            <p className="text-xs text-stone-500">{new Date(a.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${bg} ${color}`}>{a.status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Church calendar" icon={Calendar} accent="rose" iconBg="from-rose-100 to-orange-100" iconClass="text-rose-700" className="lg:col-span-2">
                {activityLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-100" />)}</div>
                ) : events.length === 0 ? (
                  <div className="py-10 text-center">
                    <Calendar className="mx-auto mb-2 h-9 w-9 text-stone-200" />
                    <p className="text-sm text-stone-500">No upcoming or recent events listed.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map(ev => (
                      <button
                        key={ev.id}
                        type="button"
                        className="group rounded-xl border border-stone-100 bg-gradient-to-br from-white to-stone-50/80 p-4 text-left shadow-sm transition-all hover:border-amber-200/90 hover:shadow-md"
                        onClick={() => navigate('/events')}
                      >
                        <p className="truncate font-semibold text-stone-900 group-hover:text-amber-900">{ev.title}</p>
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-stone-600">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {ev.location && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
    </ErrorBoundary>
    </>
  );
}
