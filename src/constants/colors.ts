/** Color mappings for different entity types */

export const ministryColors = {
  'Worship Team': 'from-amber-400 to-orange-500',
  "Children's Ministry": 'from-rose-400 to-pink-500',
  'Bible Study': 'from-blue-400 to-indigo-500',
  'Community Kitchen': 'from-emerald-400 to-teal-500',
  'Outreach': 'from-purple-400 to-violet-500',
  'Administration': 'from-slate-400 to-gray-500',
  'Youth Ministry': 'from-cyan-400 to-sky-500',
  'Prayer Team': 'from-violet-400 to-purple-500',
  'New Members': 'from-lime-400 to-green-500',
} as const;

export const eventTypeColors = {
  service: 'from-amber-400 to-orange-500',
  youth: 'from-blue-400 to-indigo-500',
  study: 'from-emerald-400 to-teal-500',
  special: 'from-rose-400 to-pink-500',
  fellowship: 'from-purple-400 to-violet-500',
} as const;

export const eventTypeBgColors = {
  service: 'bg-amber-100',
  youth: 'bg-blue-100',
  study: 'bg-emerald-100',
  special: 'bg-rose-100',
  fellowship: 'bg-purple-100',
} as const;

export const memberStatusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-stone-100 text-stone-600',
  new: 'bg-blue-100 text-blue-700',
} as const;

export const donationMethodColors = {
  Online: 'bg-blue-100 text-blue-700',
  Check: 'bg-emerald-100 text-emerald-700',
  Cash: 'bg-amber-100 text-amber-700',
} as const;

export const attendanceStatusColors = {
  present: 'text-emerald-600',
  absent: 'text-rose-600',
  late: 'text-amber-600',
} as const;

export const departmentColors = {
  'Worship Team': 'bg-amber-100 text-amber-700 border-amber-200',
  "Children's Ministry": 'bg-rose-100 text-rose-700 border-rose-200',
  'Bible Study': 'bg-blue-100 text-blue-700 border-blue-200',
  'Community Kitchen': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Outreach': 'bg-purple-100 text-purple-700 border-purple-200',
  'Administration': 'bg-slate-100 text-slate-700 border-slate-200',
  'Youth Ministry': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Prayer Team': 'bg-violet-100 text-violet-700 border-violet-200',
  'New Members': 'bg-lime-100 text-lime-700 border-lime-200',
} as const;

export const announcementTypeColors = {
  event: 'bg-amber-100 text-amber-700',
  meeting: 'bg-blue-100 text-blue-700',
  general: 'bg-emerald-100 text-emerald-700',
} as const;

export const announcementStatusColors = {
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-stone-100 text-stone-600',
} as const;

export const seriesColors = {
  'Advent 2024': 'from-rose-400 to-pink-500',
  'Thanksgiving': 'from-amber-400 to-orange-500',
  'Kingdom Living': 'from-blue-400 to-indigo-500',
  'Spiritual Warfare': 'from-purple-400 to-violet-500',
  'Prayer': 'from-emerald-400 to-teal-500',
} as const;

export const statCardColors = {
  amber: {
    gradient: 'from-amber-400 to-orange-500',
    bg: 'from-amber-50 to-orange-50 border-amber-200/50',
  },
  rose: {
    gradient: 'from-rose-400 to-pink-500',
    bg: 'from-rose-50 to-pink-50 border-rose-200/50',
  },
  emerald: {
    gradient: 'from-emerald-400 to-teal-500',
    bg: 'from-emerald-50 to-teal-50 border-emerald-200/50',
  },
  blue: {
    gradient: 'from-blue-400 to-indigo-500',
    bg: 'from-blue-50 to-indigo-50 border-blue-200/50',
  },
} as const;
