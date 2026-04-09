import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Phone, MapPin, Cake, Edit2, ChevronRight, MessageCircle,
  AlertTriangle, Gift, Check, X, Loader2, Camera, User,
  Briefcase, Home, Heart, BookOpen, Shield, Calendar,
  Activity, TrendingUp, Clock, DollarSign, CheckCircle2,
  XCircle, MinusCircle, LayoutGrid,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
    <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl group">
      <div className="w-9 h-9 rounded-lg bg-white border border-stone-200 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-stone-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-400 mb-0.5">{label}</p>
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              {type === 'select' && options ? (
                <select ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
                  className="flex-1 text-sm bg-white border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {options.map(o => <option key={o} value={o}>{o || ''}</option>)}
                </select>
              ) : (
                <input ref={inputRef} type={type} value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                  className="flex-1 text-sm bg-white border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              )}
              <button type="button" onClick={commit} disabled={saving} className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
              <button type="button" onClick={cancel} className="p-1.5 rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ) : (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <p className="text-sm font-medium text-stone-800 break-all">
                {value ? value : <span className="text-stone-400 font-normal italic">Not provided</span>}
              </p>
              {canEdit && (
                <button type="button" onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-stone-200 transition-all shrink-0">
                  <Edit2 className="w-3 h-3 text-stone-400" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

//  Tab 
function Tab({ label, icon: Icon, active, onClick }: { label: string; icon: React.ElementType; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${active ? 'bg-white text-amber-600 shadow-sm border border-stone-200/80' : 'text-stone-500 hover:text-stone-700 hover:bg-white/60'}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
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
    <><Header /><main className="p-6 lg:p-8 min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/20 to-white flex items-center justify-center">
      <div className="text-center"><Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-3" /><p className="text-stone-500">Loading profile</p></div>
    </main></>
  );

  if (error || !local) return (
    <><Header /><main className="p-6 lg:p-8 min-h-screen flex items-center justify-center">
      <div className="text-center"><AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-stone-800 mb-1">Profile not found</h2>
        <p className="text-stone-500 text-sm">{error || 'No data available'}</p>
      </div>
    </main></>
  );

  const name = local.name || 'Unknown';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const statusConfig = getMemberStatusConfig(local.status || 'pending');
  const gradient = (ministryColors as Record<string, string>)[local.primaryMinistry ?? ''] || 'from-amber-400 to-orange-500';

  return (
    <><Header />
    <ErrorBoundary>
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/20 to-white">

      {/*  Hero cover  */}
      <div className={`relative h-52 bg-gradient-to-r ${gradient}`}>
        <div className="absolute inset-0 bg-black/20" />
        {/* breadcrumb */}
        <div className="absolute top-4 left-6 flex items-center gap-2 text-white/70 text-sm">
          <button type="button" onClick={() => navigate('/members')} className="hover:text-white transition-colors">Members</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white font-medium">{memberId ? 'Member Profile' : 'My Profile'}</span>
        </div>
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

      <div className="px-6 lg:px-8 pb-10">
        {/*  Avatar row  */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 mb-6">
          <div className="flex items-end gap-4">
            {/* avatar */}
            <div className="relative shrink-0">
              <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${gradient} border-4 border-white shadow-xl flex items-center justify-center text-white font-bold text-3xl overflow-hidden`}>
                {local.profileImageUrl && !imageError
                  ? <img src={local.profileImageUrl} alt={name} className="w-full h-full object-cover" onError={() => setImageError(true)} />
                  : initials}
              </div>
              {canEdit && (
                <>
                  <button type="button" onClick={() => photoRef.current?.click()} disabled={photoUploading}
                    className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    {photoUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  </button>
                  <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
                </>
              )}
            </div>
            {/* name block */}
            <div className="pb-1">
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-stone-800">{name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-stone-500 text-sm">{local.role || 'Member'}</span>
                {local.primaryMinistry && <><span className="text-stone-300"></span><span className="text-stone-500 text-sm">{local.primaryMinistry}</span></>}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>{statusConfig.label}</span>
              </div>
            </div>
          </div>
          {/* action buttons */}
          <div className="flex gap-2 pb-1">
            {memberId && (
              <button onClick={() => navigate('/members')} className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back
              </button>
            )}
            <button disabled className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium opacity-50 cursor-not-allowed flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Message
            </button>
          </div>
        </div>

        {/*  Quick stats strip  */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Member Since', value: local.joinDate ? new Date(local.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Donations', value: donations.length ? `${donations.length} records` : '', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Attendance', value: attendance.length ? `${attendance.filter(a => a.status === 'present').length} present` : '', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Ministries', value: local.ministries?.length ? `${local.ministries.length} groups` : '', icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-stone-400">{s.label}</p>
                <p className="text-sm font-semibold text-stone-800 truncate">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/*  Tabs  */}
        <div className="flex gap-1 p-1 bg-stone-100/80 rounded-2xl mb-6 w-fit">
          <Tab label="Overview" icon={LayoutGrid} active={tab === 'overview'} onClick={() => setTab('overview')} />
          <Tab label="Personal" icon={User} active={tab === 'personal'} onClick={() => setTab('personal')} />
          <Tab label="Ministry" icon={Gift} active={tab === 'ministry'} onClick={() => setTab('ministry')} />
          <Tab label="Activity" icon={Activity} active={tab === 'activity'} onClick={() => setTab('activity')} />
        </div>
        {/* Tab panels */}
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact */}
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-amber-500" />Contact</h3>
                <div className="space-y-2">
                  <EditableField label="Email" value={local.email || ''} icon={Mail} type="email" canEdit={canEdit} onSave={v => save({ email: v })} />
                  <EditableField label="Phone" value={local.phone || ''} icon={Phone} type="tel" canEdit={canEdit} onSave={v => save({ phone: v })} />
                  <EditableField label="Address" value={local.address || ''} icon={MapPin} canEdit={canEdit} onSave={v => save({ address: v })} />
                  <EditableField label="City" value={local.city || ''} icon={Home} canEdit={canEdit} onSave={v => save({ city: v })} />
                </div>
              </div>
              {/* Quick personal */}
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User className="w-4 h-4 text-amber-500" />About</h3>
                <div className="space-y-2">
                  <EditableField label="Date of Birth" value={local.dateOfBirth || ''} icon={Cake} type="date" canEdit={canEdit} onSave={v => save({ dateOfBirth: v })} />
                  <EditableField label="Occupation" value={local.occupation || ''} icon={Briefcase} canEdit={canEdit} onSave={v => save({ occupation: v })} />
                  <EditableField label="Hometown" value={local.hometown || ''} icon={Home} canEdit={canEdit} onSave={v => save({ hometown: v })} />
                  <EditableField label="Marital Status" value={local.maritalStatus || ''} icon={Heart} type="select" options={['', 'Single', 'Married', 'Divorced', 'Widowed']} canEdit={canEdit} onSave={v => save({ maritalStatus: v })} />
                </div>
              </div>
              {/* Ministry summary */}
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm lg:col-span-2">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Gift className="w-4 h-4 text-amber-500" />Ministry Involvement</h3>
                {local.ministries?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {local.ministries.map(m => (
                      <div key={m.id} className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                        <p className="text-sm font-semibold text-stone-800">{m.ministryName}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{m.role.charAt(0).toUpperCase() + m.role.slice(1)} &middot; Joined {new Date(m.joinedDate).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-stone-400">Not linked to any ministries yet.</p>}
              </div>
            </motion.div>
          )}

          {/* PERSONAL */}
          {tab === 'personal' && (
            <motion.div key="personal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User className="w-4 h-4 text-amber-500" />Personal Details</h3>
                <div className="space-y-2">
                  <EditableField label="Date of Birth" value={local.dateOfBirth || ''} icon={Cake} type="date" canEdit={canEdit} onSave={v => save({ dateOfBirth: v })} />
                  <EditableField label="Hometown" value={local.hometown || ''} icon={Home} canEdit={canEdit} onSave={v => save({ hometown: v })} />
                  <EditableField label="Occupation" value={local.occupation || ''} icon={Briefcase} canEdit={canEdit} onSave={v => save({ occupation: v })} />
                  <EditableField label="Education" value={local.education || ''} icon={BookOpen} canEdit={canEdit} onSave={v => save({ education: v })} />
                  <EditableField label="Marital Status" value={local.maritalStatus || ''} icon={Heart} type="select" options={['', 'Single', 'Married', 'Divorced', 'Widowed']} canEdit={canEdit} onSave={v => save({ maritalStatus: v })} />
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500" />Emergency Contact</h3>
                <div className="space-y-2">
                  <EditableField label="Name" value={local.emergencyContact?.name || ''} icon={User} canEdit={canEdit} onSave={v => save({ emergencyContact: { ...local.emergencyContact, name: v, phone: local.emergencyContact?.phone || '', relationship: local.emergencyContact?.relationship || '' } })} />
                  <EditableField label="Phone" value={local.emergencyContact?.phone || ''} icon={Phone} type="tel" canEdit={canEdit} onSave={v => save({ emergencyContact: { ...local.emergencyContact, name: local.emergencyContact?.name || '', phone: v, relationship: local.emergencyContact?.relationship || '' } })} />
                  <EditableField label="Relationship" value={local.emergencyContact?.relationship || ''} icon={Heart} type="select" options={['', 'Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']} canEdit={canEdit} onSave={v => save({ emergencyContact: { ...local.emergencyContact, name: local.emergencyContact?.name || '', phone: local.emergencyContact?.phone || '', relationship: v } })} />
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-amber-500" />Contact</h3>
                <div className="space-y-2">
                  <EditableField label="Email" value={local.email || ''} icon={Mail} type="email" canEdit={canEdit} onSave={v => save({ email: v })} />
                  <EditableField label="Phone" value={local.phone || ''} icon={Phone} type="tel" canEdit={canEdit} onSave={v => save({ phone: v })} />
                  <EditableField label="Address" value={local.address || ''} icon={MapPin} canEdit={canEdit} onSave={v => save({ address: v })} />
                  <EditableField label="City" value={local.city || ''} icon={Home} canEdit={canEdit} onSave={v => save({ city: v })} />
                </div>
              </div>
            </motion.div>
          )}

          {/* MINISTRY */}
          {tab === 'ministry' && (
            <motion.div key="ministry" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Gift className="w-4 h-4 text-amber-500" />Ministry Groups</h3>
                {local.ministries?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {local.ministries.map((m, i) => {
                      const colors = ['from-amber-400 to-orange-500','from-blue-400 to-indigo-500','from-emerald-400 to-teal-500','from-rose-400 to-pink-500','from-purple-400 to-violet-500'];
                      const c = colors[i % colors.length];
                      return (
                        <div key={m.id} className="rounded-2xl border border-stone-100 overflow-hidden">
                          <div className={`h-2 bg-gradient-to-r ${c}`} />
                          <div className="p-4">
                            <p className="font-semibold text-stone-800">{m.ministryName}</p>
                            <p className="text-xs text-stone-500 mt-1">{m.role.charAt(0).toUpperCase() + m.role.slice(1)}</p>
                            <p className="text-xs text-stone-400 mt-0.5">Joined {new Date(m.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Gift className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-400 text-sm">Not linked to any ministries yet.</p>
                  </div>
                )}
              </div>
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500" />Role & Assignment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <EditableField label="Church Role" value={local.role || ''} icon={User} canEdit={canEdit} onSave={v => save({ role: v })} />
                  <EditableField label="Primary Ministry" value={local.primaryMinistry || ''} icon={Gift} canEdit={canEdit} onSave={v => save({ primaryMinistry: v })} />
                  <EditableField label="Join Date" value={local.joinDate || ''} icon={Calendar} type="date" canEdit={canEdit} onSave={v => save({ joinDate: v })} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ACTIVITY */}
          {tab === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donations */}
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" />Recent Donations</h3>
                {activityLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />)}</div>
                ) : donations.length === 0 ? (
                  <div className="text-center py-8"><DollarSign className="w-8 h-8 text-stone-200 mx-auto mb-2" /><p className="text-stone-400 text-sm">No donation records found.</p></div>
                ) : (
                  <div className="space-y-2">
                    {donations.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 hover:bg-emerald-50/50 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800">GH&#8373; {d.amount.toLocaleString()}</p>
                          <p className="text-xs text-stone-400">{d.fundType} &middot; {new Date(d.date).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs text-stone-400 shrink-0">{formatDistanceToNow(new Date(d.date), { addSuffix: true })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Attendance */}
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Attendance History</h3>
                {activityLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />)}</div>
                ) : attendance.length === 0 ? (
                  <div className="text-center py-8"><Clock className="w-8 h-8 text-stone-200 mx-auto mb-2" /><p className="text-stone-400 text-sm">No attendance records found.</p></div>
                ) : (
                  <div className="space-y-2">
                    {attendance.map(a => {
                      const Icon = a.status === 'present' ? CheckCircle2 : a.status === 'absent' ? XCircle : MinusCircle;
                      const color = a.status === 'present' ? 'text-emerald-500' : a.status === 'absent' ? 'text-rose-500' : 'text-amber-500';
                      const bg = a.status === 'present' ? 'bg-emerald-50' : a.status === 'absent' ? 'bg-rose-50' : 'bg-amber-50';
                      return (
                        <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 hover:bg-stone-100/60 transition-colors">
                          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{a.eventName || 'Service'}</p>
                            <p className="text-xs text-stone-400">{new Date(a.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bg} ${color}`}>{a.status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Events */}
              <div className="bg-white/80 backdrop-blur rounded-2xl border border-stone-200/50 p-6 shadow-sm lg:col-span-2">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-rose-500" />Recent Events</h3>
                {activityLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />)}</div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8"><Calendar className="w-8 h-8 text-stone-200 mx-auto mb-2" /><p className="text-stone-400 text-sm">No events found.</p></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {events.map(ev => (
                      <div key={ev.id} className="p-4 rounded-xl bg-stone-50 border border-stone-100 hover:border-amber-200 transition-colors cursor-pointer" onClick={() => navigate('/events')}>
                        <p className="text-sm font-semibold text-stone-800 truncate">{ev.title}</p>
                        <p className="text-xs text-stone-500 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        {ev.location && <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
    </ErrorBoundary>
    </>
  );
}
