import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
}

export const attendanceStatusConfig: Record<string, StatusConfig> = {
  present: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    label: 'Present',
  },
  absent: {
    icon: XCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    label: 'Absent',
  },
  late: {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    label: 'Late',
  },
} as const;

// Default fallback for unknown status
export const defaultStatusConfig: StatusConfig = {
  icon: Clock,
  color: 'text-stone-600',
  bg: 'bg-stone-100',
  label: 'Unknown',
} as const;

/**
 * Get status configuration with fallback
 * @param status The status key to look up
 * @returns StatusConfig with icon, colors, and label
 */
export const getAttendanceStatusConfig = (
  status: string
): StatusConfig => {
  return (
    (attendanceStatusConfig[status as keyof typeof attendanceStatusConfig] ||
      defaultStatusConfig)
  );
};

// Member profile status configuration
export const memberStatusConfig: Record<string, StatusConfig> = {
  active: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    label: 'Active',
  },
  inactive: {
    icon: XCircle,
    color: 'text-stone-500',
    bg: 'bg-stone-100',
    label: 'Inactive',
  },
  visitor: {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    label: 'Visitor',
  },
  pending: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    label: 'Pending',
  },
} as const;

export const getMemberStatusConfig = (status: string): StatusConfig => {
  return (
    (memberStatusConfig[status as keyof typeof memberStatusConfig] ||
      defaultStatusConfig)
  );
};
