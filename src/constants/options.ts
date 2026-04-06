/** Options for dropdowns and select fields */

export const roleOptions = [
  'Member',
  'Volunteer',
  'Ministry Leader',
  'Deacon',
  'Elder',
  'Pastor',
  'Staff',
  'Admin',
] as const;

export const ministryOptions = [
  'Worship Team',
  "Children's Ministry",
  'Youth Ministry',
  'Bible Study',
  'Community Kitchen',
  'Outreach',
  'Administration',
  'Prayer Team',
  'New Members',
] as const;

export const donationMethodOptions = ['Online', 'Check', 'Cash'] as const;

export const attendanceStatusOptions = ['present', 'absent', 'late'] as const;

export const memberStatusOptions = ['active', 'inactive', 'new'] as const;

export const eventTypeOptions = ['service', 'youth', 'study', 'special', 'fellowship'] as const;

export const fundOptions = [
  'General Fund',
  'Building Fund',
  'Missions',
  'Youth Ministry',
  "Children's Ministry",
] as const;
