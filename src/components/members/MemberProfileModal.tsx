import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Phone, MapPin, Calendar, Heart, Users, Edit,
  Cake, Building2, GraduationCap, Home, AlertTriangle,
  HandHeart, Trash2, User, Briefcase, FileText,
  CalendarDays, ChevronRight, Award, Shield, Clock,
  Wallet, TrendingUp, Activity, Star, PhoneCall, MessageCircle,
} from 'lucide-react';
import type { Member, Donation, Attendance } from '../../services/api';
import { ministryColors } from '../../constants/colors';

type ProfileTab = 'overview' | 'donations' | 'attendance' | 'family';

interface TabCache {
  [key: string]: Donation[] | Attendance[] | any[] | undefined;
}

interface Props {
  member: Member;
  activeTab: ProfileTab;
  tabCache: TabCache;
  tabLoading: Record<ProfileTab, boolean>;
  tabError: Record<ProfileTab, string | null>;
  canManage: boolean;
  onClose: () => void;
  onEdit: (m: Member) => void;
  onDelete: (m: Member) => void;
  onTabChange: (tab: ProfileTab) => void;
}

function memberInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function yearsAsMember(joinDate: string) {
  const joined = new Date(joinDate);
  const now = new Date();
  const years = now.getFullYear() - joined.getFullYear();
  const months = now.getMonth() - joined.getMonth();
  if (years === 0) return months <= 1 ? 'New member' : `${months}mo`;
  return years === 1 ? '1 year' : `${years} years`;
}

function ageFromDob(dob: string) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  active:   { label: 'Active',   dot: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  inactive: { label: 'Inactive', dot: 'bg-stone-400',   badge: 'bg-stone-100 text-stone-600 ring-stone-200' },
  new:      { label: 'New',      dot: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-700 ring-blue-200' },
};

const tabDef: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',   label: 'Overview',   icon: <User className="w-3.5 h-3.5" /> },
  { id: 'donations',  label: 'Giving',     icon: <HandHeart className="w-3.5 h-3.5" /> },
  { id: 'attendance', label: 'Attendance', icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { id: 'family',     label: 'Family',     icon: <Users className="w-3.5 h-3.5" /> },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 group py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-amber-100 flex items-center justify-center text-stone-400 group-hover:text-amber-600 transition-colors shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-stone-700 truncate">{value || '—'}</p>
      </div>
      {href && <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-amber-400 ml-auto shrink-0 transition-colors" />}
    </div>
  );
  return href ? <a href={href}>{content}</a> : <div>{content}</div>;
}

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl ${color}`}>
      <div className="opacity-70">{icon}</div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{label}</p>
    </div>
  );
}

function TabSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
      <p className="text-sm text-stone-500">{label}</p>
    </div>
  );
}

function TabEmpty({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-300">{icon}</div>
      <p className="font-medium text-stone-600">{title}</p>
      <p className="text-sm text-stone-400 max-w-xs">{sub}</p>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-3 mb-0.5">
      {children}
    </p>
  );
}

function InfoCard({ icon, label, value, sub, accent = false }:
  { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 flex flex-col gap-1.5 ${accent ? 'bg-amber-50 border-amber-100' : 'bg-stone-50 border-stone-100'}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? 'bg-amber-100 text-amber-600' : 'bg-stone-200 text-stone-500'}`}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{label}</p>
      <p className="text-sm font-semibold text-stone-800 leading-snug">{value || '—'}</p>
      {sub && <p className="text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ member }: { member: Member }) {
  const age = ageFromDob(member.dateOfBirth);
  const tenure = yearsAsMember(member.joinDate);

  const street = member.address || '';
  const cityLine = [member.city, member.state, member.zipCode].filter(Boolean).join(', ');
  const fullAddress = [street, cityLine].filter(Boolean).join('\n') || null;

  const joinedFull = member.joinDate
    ? new Date(member.joinDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const birthdayFull = member.dateOfBirth
    ? new Date(member.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const nextBirthday = member.dateOfBirth ? (() => {
    const today = new Date();
    const dob = new Date(member.dateOfBirth);
    const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
    return diff === 0 ? 'Today 🎂' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;
  })() : null;

  const hasMinistries = member.ministries && member.ministries.length > 0;
  const hasDepts = member.departments && member.departments.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-2">

      {/* ── Quick-glance stat cards ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <InfoCard
          icon={<Calendar className="w-3.5 h-3.5" />}
          label="Member since"
          value={joinedFull ? new Date(member.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
          sub={tenure}
          accent
        />
        <InfoCard
          icon={<Cake className="w-3.5 h-3.5" />}
          label="Age"
          value={age !== null ? `${age} yrs` : '—'}
          sub={nextBirthday ?? undefined}
        />
        <InfoCard
          icon={<Heart className="w-3.5 h-3.5" />}
          label="Ministry"
          value={member.primaryMinistry || 'Unassigned'}
        />
      </div>

      {/* ── Contact ── */}
      <section>
        <SectionLabel>Contact</SectionLabel>
        <div className="divide-y divide-stone-50">
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email address" value={member.email} href={`mailto:${member.email}`} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone number" value={member.phone || '—'} href={member.phone ? `tel:${member.phone}` : undefined} />
        </div>
      </section>

      {/* ── Address ── */}
      {fullAddress && (
        <section>
          <SectionLabel>Address</SectionLabel>
          <div className="mx-3 mt-1 rounded-2xl bg-stone-50 border border-stone-100 p-3.5 flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-500 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              {street && <p className="text-sm font-medium text-stone-800">{street}</p>}
              {cityLine && <p className="text-sm text-stone-500">{cityLine}</p>}
            </div>
          </div>
        </section>
      )}

      {/* ── Personal details ── */}
      <section>
        <SectionLabel>Personal</SectionLabel>
        <div className="divide-y divide-stone-50">
          {birthdayFull && (
            <InfoRow
              icon={<Cake className="w-4 h-4" />}
              label="Date of birth"
              value={`${birthdayFull}${age !== null ? ` · ${age} years old` : ''}`}
            />
          )}
          {member.maritalStatus && (
            <InfoRow icon={<Heart className="w-4 h-4" />} label="Marital status" value={member.maritalStatus} />
          )}
          {member.baptismStatus && (
            <InfoRow icon={<Award className="w-4 h-4" />} label="Baptism status" value={member.baptismStatus} />
          )}
          {member.occupation && (
            <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Occupation" value={member.occupation} />
          )}
          {member.education && (
            <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Education" value={member.education} />
          )}
          {member.hometown && (
            <InfoRow icon={<Home className="w-4 h-4" />} label="Hometown" value={member.hometown} />
          )}
        </div>
      </section>

      {/* ── Church involvement ── */}
      <section>
        <SectionLabel>Church involvement</SectionLabel>
        <div className="divide-y divide-stone-50">
          <InfoRow
            icon={<User className="w-4 h-4" />}
            label="Role"
            value={member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : '—'}
          />
          <InfoRow
            icon={<Heart className="w-4 h-4" />}
            label="Primary ministry"
            value={member.primaryMinistry || 'Not assigned'}
          />
          {joinedFull && (
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Joined" value={joinedFull} />
          )}
        </div>

        {/* Ministry links */}
        {hasMinistries && (
          <div className="mt-3 mx-3 space-y-2">
            {member.ministries!.map(m => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-sm font-medium text-stone-700">{m.ministryName}</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Ministry involvement tags */}
        {member.ministryInvolvement && member.ministryInvolvement.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {member.ministryInvolvement.map(m => (
              <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold">
                <Users className="w-3 h-3" />
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Department tags */}
        {hasDepts && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {member.departments.map(dept => (
              <span key={dept} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold">
                <Building2 className="w-3 h-3" />
                {dept}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Emergency contact ── */}
      {member.emergencyContact?.name && (
        <section>
          <SectionLabel>Emergency contact</SectionLabel>
          <div className="mx-3 mt-1 rounded-2xl bg-rose-50 border border-rose-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">{member.emergencyContact.name}</p>
                  {member.emergencyContact.relationship && (
                    <p className="text-xs text-stone-500">{member.emergencyContact.relationship}</p>
                  )}
                </div>
              </div>
              {member.emergencyContact.phone && (
                <a
                  href={`tel:${member.emergencyContact.phone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition-colors shrink-0"
                >
                  <Phone className="w-3 h-3" />
                  {member.emergencyContact.phone}
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Account info ── */}
      {member.createdAt && (
        <section>
          <SectionLabel>Account</SectionLabel>
          <div className="divide-y divide-stone-50">
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="Record created"
              value={new Date(member.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            />
            <InfoRow
              icon={<Award className="w-4 h-4" />}
              label="Member ID"
              value={`#${member.id.slice(0, 8).toUpperCase()}`}
            />
          </div>
        </section>
      )}

      {/* ── Notes ── */}
      {member.notes && (
        <section>
          <SectionLabel>Notes</SectionLabel>
          <div className="mx-3 mt-1 rounded-2xl bg-stone-50 border border-stone-100 p-4 flex gap-3">
            <FileText className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{member.notes}</p>
          </div>
        </section>
      )}
    </motion.div>
  );
}

// ─── Donations Tab ────────────────────────────────────────────────────────────

function DonationsTab({ donations, loading, error }: { donations?: Donation[]; loading: boolean; error: string | null }) {
  if (loading) return <TabSpinner label="Loading giving history…" />;
  if (error) return (
    <div className="flex flex-col items-center py-16 gap-3">
      <AlertTriangle className="w-10 h-10 text-rose-400" />
      <p className="text-sm text-stone-500">{error}</p>
    </div>
  );
  if (!donations?.length) return (
    <TabEmpty icon={<HandHeart className="w-7 h-7" />} title="No giving records" sub="Donations made by this member will appear here." />
  );

  const total = donations.reduce((s, d) => s + d.amount, 0);
  const largest = Math.max(...donations.map(d => d.amount));
  const recurring = donations.filter(d => d.isRecurring).length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill icon={<Wallet className="w-4 h-4" />} label="Total Given" value={`GH₵${total.toLocaleString()}`} color="bg-emerald-50 text-emerald-700" />
        <StatPill icon={<TrendingUp className="w-4 h-4" />} label="Largest Gift" value={`GH₵${largest.toLocaleString()}`} color="bg-amber-50 text-amber-700" />
        <StatPill icon={<Activity className="w-4 h-4" />} label="Recurring" value={String(recurring)} color="bg-blue-50 text-blue-700" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {donations.map((d) => (
          <div key={d.id} className="flex items-center gap-4 p-3.5 rounded-2xl bg-stone-50 border border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <HandHeart className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-emerald-700">GH₵{d.amount.toLocaleString()}</span>
                <span className="px-2 py-0.5 rounded-full bg-white border border-stone-200 text-stone-600 text-[10px] font-semibold">{d.fundType}</span>
                {d.isRecurring && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-semibold">↻ {d.recurringFrequency}</span>
                )}
              </div>
              {d.notes && <p className="text-xs text-stone-400 mt-0.5 truncate">{d.notes}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium text-stone-500">
                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="text-[10px] text-stone-400">{d.paymentMethod}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceTab({ records, loading, error }: { records?: Attendance[]; loading: boolean; error: string | null }) {
  if (loading) return <TabSpinner label="Loading attendance records…" />;
  if (error) return (
    <div className="flex flex-col items-center py-16 gap-3">
      <AlertTriangle className="w-10 h-10 text-rose-400" />
      <p className="text-sm text-stone-500">{error}</p>
    </div>
  );
  if (!records?.length) return (
    <TabEmpty icon={<CalendarDays className="w-7 h-7" />} title="No attendance records" sub="Event attendance for this member will appear here." />
  );

  const present = records.filter(r => r.status === 'present').length;
  const rate = Math.round((present / records.length) * 100);
  const late = records.filter(r => r.status === 'late').length;

  const statusStyle: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-700',
    late:    'bg-amber-100 text-amber-700',
    excused: 'bg-blue-100 text-blue-700',
    absent:  'bg-rose-100 text-rose-700',
  };
  const statusDot: Record<string, string> = {
    present: 'bg-emerald-400',
    late:    'bg-amber-400',
    excused: 'bg-blue-400',
    absent:  'bg-rose-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill icon={<Activity className="w-4 h-4" />} label="Rate" value={`${rate}%`} color="bg-emerald-50 text-emerald-700" />
        <StatPill icon={<Star className="w-4 h-4" />} label="Present" value={String(present)} color="bg-amber-50 text-amber-700" />
        <StatPill icon={<Clock className="w-4 h-4" />} label="Late" value={String(late)} color="bg-blue-50 text-blue-700" />
      </div>

      {/* Attendance rate bar */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-stone-500">Attendance rate</span>
          <span className="text-xs font-bold text-stone-700">{rate}%</span>
        </div>
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${rate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {records.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-100 hover:border-amber-200 transition-all">
            <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot[r.status] || 'bg-stone-300'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{r.eventName || 'Event'}</p>
              {r.notes && <p className="text-xs text-stone-400 truncate">{r.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle[r.status] || 'bg-stone-100 text-stone-600'}`}>
                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </span>
              <span className="text-xs text-stone-400">
                {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Family Tab ───────────────────────────────────────────────────────────────

function FamilyTab({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <TabSpinner label="Loading family information…" />;
  if (error) return (
    <TabEmpty icon={<AlertTriangle className="w-7 h-7 text-rose-400" />} title={error} sub="" />
  );
  return (
    <TabEmpty icon={<Users className="w-7 h-7" />} title="Family information coming soon" sub="Family relationships and household connections will appear here." />
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function MemberProfileModal({
  member, activeTab, tabCache, tabLoading, tabError,
  canManage, onClose, onEdit, onDelete, onTabChange,
}: Props) {
  const gradient = ministryColors[member.primaryMinistry as keyof typeof ministryColors] || 'from-stone-400 to-gray-500';
  const sc = statusConfig[member.status] ?? statusConfig.active;
  const tenure = yearsAsMember(member.joinDate);

  const donations  = tabCache[`${member.id}-donations`]  as Donation[]   | undefined;
  const attendance = tabCache[`${member.id}-attendance`] as Attendance[] | undefined;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* ── Hero Banner ── */}
          <div className={`relative bg-gradient-to-br ${gradient} shrink-0`}>
            {/* close */}
            <button
              onClick={onClose}
              aria-label="Close profile"
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* top padding for avatar overlap */}
            <div className="h-24" />

            {/* Avatar row */}
            <div className="px-6 pb-5 flex items-end gap-4 -mb-10">
              <div className={`w-20 h-20 rounded-2xl ring-4 ring-white shadow-xl shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-2xl
                ${member.profileImageUrl ? 'bg-stone-200' : `bg-gradient-to-br ${gradient}`}`}>
                {member.profileImageUrl
                  ? <img src={member.profileImageUrl} alt={member.name} className="w-full h-full object-cover" />
                  : memberInitials(member.name)}
              </div>
              <div className="pb-1 min-w-0">
                <h2 className="text-xl font-bold text-white leading-tight truncate">{member.name}</h2>
                <p className="text-white/80 text-sm font-medium capitalize">{member.role}</p>
              </div>
            </div>
          </div>

          {/* ── Identity strip ── */}
          <div className="pt-12 px-6 pb-4 border-b border-stone-100 flex items-center justify-between gap-3 shrink-0">
            {/* status + tenure */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${sc.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              <span className="text-xs text-stone-400 font-medium">{tenure}</span>
              {member.primaryMinistry && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-stone-500 font-medium">
                  <Heart className="w-3 h-3 text-amber-400" />
                  {member.primaryMinistry}
                </span>
              )}
            </div>

            {/* action buttons */}
            <div className="flex items-center gap-1.5">
              <a href={`tel:${member.phone}`} aria-label="Call member"
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-amber-100 hover:text-amber-600 text-stone-500 flex items-center justify-center transition-colors">
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
              <a href={`mailto:${member.email}`} aria-label="Email member"
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-amber-100 hover:text-amber-600 text-stone-500 flex items-center justify-center transition-colors">
                <Mail className="w-3.5 h-3.5" />
              </a>
              {canManage && (
                <button onClick={() => onEdit(member)} aria-label="Edit member"
                  className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-amber-100 hover:text-amber-600 text-stone-500 flex items-center justify-center transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
              {canManage && (
                <button onClick={() => onDelete(member)} aria-label="Delete member"
                  className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-rose-100 hover:text-rose-600 text-stone-500 flex items-center justify-center transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="px-6 pt-3 pb-0 shrink-0">
            <div className="flex gap-0.5 bg-stone-100 p-1 rounded-xl">
              {tabDef.map(t => (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === t.id
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Scrollable tab content ── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeTab === 'overview'   && <OverviewTab member={member} />}
            {activeTab === 'donations'  && <DonationsTab  donations={donations}  loading={tabLoading.donations}  error={tabError.donations} />}
            {activeTab === 'attendance' && <AttendanceTab records={attendance}   loading={tabLoading.attendance} error={tabError.attendance} />}
            {activeTab === 'family'     && <FamilyTab loading={tabLoading.family} error={tabError.family} />}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/60">
            <button onClick={onClose} className="text-sm text-stone-400 hover:text-stone-600 font-medium transition-colors">
              Close
            </button>
            <a
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Send Message
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
