/**
 * API Service Layer
 * Centralized API calls for all ChurchApp features
 * Now integrated with Supabase backend
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { supabaseApi } from './supabaseApi';
import { supabase } from './supabaseClient';
import { daysBetweenCalendarDates, getNextBirthdayDate } from '../utils/helpers';

/** User-facing text when PostgREST returns 403 + Postgres 42501 (RLS). */
function formatSupabaseAccessError(error: unknown, fallback: string): string {
  const rec =
    error && typeof error === 'object'
      ? (error as { code?: string; message?: string })
      : null;
  const code = rec?.code;
  const message = rec?.message ?? (error instanceof Error ? error.message : '');

  // Handle duplicate key constraint violations (unique constraint errors)
  if (code === '23505') {
    if (/members_email_key/i.test(message)) {
      return 'A member with this email address already exists. Please use a different email address.';
    }
    return 'This record already exists. Please check your input and try again.';
  }

  if (
    code === '42501' ||
    /row-level security/i.test(message) ||
    /permission denied/i.test(message)
  ) {
    return (
      'Access denied. Please ensure: \n' +
      '1. You have run grant_admin_role.sql with your email in Supabase SQL Editor.\n' +
      '2. You have run supabase_storage_member_photos.sql to create the bucket and policies.'
    );
  }

  const errName =
    error && typeof error === 'object' && 'name' in error
      ? String((error as { name?: string }).name)
      : '';

  // Browser could not reach Supabase at all (wrong URL, offline, CORS, paused project, VPN/firewall).
  if (
    errName === 'AuthRetryableFetchError' ||
    /failed to fetch/i.test(message) ||
    /networkerror/i.test(message) ||
    /load failed/i.test(message)
  ) {
    return (
      'Cannot reach Supabase (network error). Check: internet connection; VITE_SUPABASE_URL is ' +
      'https://YOUR-PROJECT.supabase.co with no typo; project is not paused in the Supabase dashboard; ' +
      'VPN/firewall/ad-block is not blocking *.supabase.co; restart dev server after changing .env.'
    );
  }

  if (message) return message;
  return fallback;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'new';
  role: string;
  primaryMinistry: string;
  joinDate: string;
  dateOfBirth: string;
  departments: string[];
  education?: string;
  hometown?: string;
  occupation?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
  /** Public URL from Supabase Storage or elsewhere (`members.profile_image_url`) */
  profileImageUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdAt?: string;
  ministries?: MemberMinistryLink[];
  baptismStatus?: string;
  maritalStatus?: string;
  ministryInvolvement?: string[];
}

export interface MemberCreateInput extends Omit<Member, 'id' | 'ministries'> {
  ministryInvolvement?: string[];
}

export interface MemberMinistryLink {
  id: string;
  ministryId: string;
  ministryName: string;
  role: 'leader' | 'member' | 'volunteer';
  joinedDate: string;
}

export interface UpcomingBirthday {
  id: string;
  name: string;
  dateOfBirth: string;
  profileImageUrl?: string;
  /** Next occurrence (local), for sorting/display */
  nextBirthdayLabel: string;
  daysUntil: number;
  turningAge: number;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  attendees: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  description?: string;
  type: 'service' | 'youth' | 'study' | 'special' | 'fellowship' | 'other';
  ministry?: string;
}

export interface Attendance {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  eventId: string;
  eventName?: string;
  notes?: string;
}

export interface Donation {
  id: string;
  donorId?: string;
  donorName?: string;
  donorEmail?: string;
  amount: number;
  date: string;
  paymentMethod: string;
  fundType: string;
  isRecurring: boolean;
  recurringFrequency?: string;
  notes?: string;
  reference?: string;
  receiptNumber?: string;
}

export interface Sermon {
  id: number;
  title: string;
  speaker: string;
  date: string;
  duration: number;
  ministry: string;
  videoUrl?: string;
  audioUrl?: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  createdDate: string;
  expiryDate?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  authorId: number;
}

export interface Report {
  id: number;
  name: string;
  type: 'attendance' | 'donations' | 'membership' | 'ministry';
  generatedDate: string;
  period: string;
  data: Record<string, unknown>;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: string;
  paymentReference?: string;
  vendorName?: string;
  vendorContact?: string;
  budgetCategory?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  receiptUrl?: string;
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
}

export interface Settings {
  churchName: string;
  churchEmail: string;
  churchPhone: string;
  churchAddress: string;
  timeZone: string;
  currency: string;
  notificationsEnabled: boolean;
  language: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

// ============================================================================
// MEMBER API (Supabase integration)
// ============================================================================

/** Minimal shape of a raw member row from the database */
interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  membership_status?: string | null;
  role?: string | null;
  primary_ministry?: string | null;
  join_date?: string | null;
  date_of_birth?: string | null;
  departments?: string[] | null;
  education?: string | null;
  hometown?: string | null;
  occupation?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  notes?: string | null;
  profile_image_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  created_at?: string | null;
}

/**
 * Transform database row to Member interface
 */
function transformMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    email: row.email,
    phone: row.phone || '',
    status: row.membership_status === 'visitor' ? 'new' : row.membership_status as 'active' | 'inactive' | 'new',
    role: row.role || 'member', // Use the fetched role, default to 'member'
    primaryMinistry: row.primary_ministry || '',
    joinDate: row.join_date,
    dateOfBirth: row.date_of_birth || '',
    departments: row.departments || [],
    education: row.education || '',
    hometown: row.hometown || '',
    occupation: row.occupation || '',
    emergencyContact: {
      name: row.emergency_contact_name || '',
      phone: row.emergency_contact_phone || '',
      relationship: row.emergency_contact_relationship || '',
    },
    notes: row.notes || '',
    profileImageUrl: row.profile_image_url || undefined,
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || '',
    createdAt: row.created_at || undefined,
  };
}

export const membersApi = {
  /**
   * Fetch all members with pagination
   */
  async getMembers(page = 1, pageSize = 10, status?: string): Promise<PaginatedResponse<Member>> {
    try {
      const offset = (page - 1) * pageSize;
      const { data, count } = await supabaseApi.members.getMembers({
        limit: pageSize,
        offset,
        status,
      });

      const members: Member[] = data.map(transformMemberRow);

      return {
        success: true,
        data: members,
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      };
    } catch (error) {
      console.error('Failed to fetch members:', error);
      return {
        success: false,
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch members',
      };
    }
  },

  /**
   * Fetch single member by ID
   */
  async getMember(id: string): Promise<ApiResponse<Member>> {
    try {
      const member = await supabaseApi.members.getMember(id);
      const memberMinistries = await supabaseApi.ministries.getMemberMinistries(id);
      return { success: true, data: { ...transformMemberRow(member), ministries: memberMinistries } };
    } catch (error) {
      console.error(`Failed to fetch member ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch member',
      };
    }
  },

  /**
   * Fetch current user's profile
   */
  async getCurrentUserProfile(): Promise<ApiResponse<Member>> {
    try {
      const member = await supabaseApi.members.getCurrentUserProfile();
      return { success: true, data: transformMemberRow(member) };
    } catch (error) {
      console.error('Failed to fetch current user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
      };
    }
  },

  /**
   * Check if email already exists
   */
  async checkEmailExists(email: string): Promise<ApiResponse<boolean>> {
    try {
      const { count, error } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('email', email.trim().toLowerCase());

      if (error) throw error;
      return { success: true, data: (count ?? 0) > 0 };
    } catch (error) {
      console.error('Failed to check email existence:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check email',
      };
    }
  },

  /**
   * Create new member
   */
  async createMember(member: MemberCreateInput): Promise<ApiResponse<Member>> {
    try {
      // Transform the input to match Supabase schema
      const membershipStatus = member.status === 'new' ? 'visitor' : member.status;

      const memberInsert: any = {
        first_name: member.name.split(' ')[0] || '',
        last_name: member.name.split(' ').slice(1).join(' ') || '',
        email: member.email,
        phone: member.phone,
        membership_status: membershipStatus as 'active' | 'inactive' | 'visitor',
        join_date: member.joinDate,
        date_of_birth: member.dateOfBirth || undefined,
        address: member.address || undefined,
        city: member.city || undefined,
        state: member.state || undefined,
        zip_code: member.zipCode || undefined,
        role: member.role,
        primary_ministry: member.primaryMinistry,
        education: member.education,
        hometown: member.hometown,
        occupation: member.occupation,
        emergency_contact_name: member.emergencyContact?.name,
        emergency_contact_phone: member.emergencyContact?.phone,
        emergency_contact_relationship: member.emergencyContact?.relationship,
        departments: member.departments,
        notes: member.notes,
      };

      const data = await supabaseApi.members.createMember(memberInsert);

      const involvementNames = Array.from(
        new Set([
          ...(member.ministryInvolvement || []),
          ...(member.primaryMinistry ? [member.primaryMinistry] : []),
        ].filter(Boolean))
      );

      if (involvementNames.length) {
        const ministries = await supabaseApi.ministries.getMinistriesByNames(involvementNames);
        const ministryMap = new Map(ministries.map((m) => [m.name, m.id]));

        await Promise.all(
          involvementNames
            .map((name) => ministryMap.get(name))
            .filter((id): id is string => Boolean(id))
            .map((ministryId) =>
              supabaseApi.ministries.addMemberToMinistry({
                memberId: data.id,
                ministryId,
                role: 'member',
              })
            )
        );
      }

      return { success: true, data: transformMemberRow(data) };
    } catch (error) {
      console.error(
        'Failed to create member:',
        error instanceof Error ? error : JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      const msg = formatSupabaseAccessError(
        error,
        'Failed to create member. Check your connection and try again.'
      );
      return { success: false, error: msg };
    }
  },

  /**
   * Update existing member
   */
  async updateMember(id: string | number, member: Partial<Member>): Promise<ApiResponse<Member>> {
    try {
      const updates: Record<string, unknown> = {};
      if (member.name) {
        updates.first_name = member.name.split(' ')[0] || '';
        updates.last_name = member.name.split(' ').slice(1).join(' ') || '';
      }
      if (member.email) updates.email = member.email;
      if (member.phone) updates.phone = member.phone;
      if (member.status) updates.membership_status = member.status === 'new' ? 'visitor' : member.status;
      if (member.joinDate) updates.join_date = member.joinDate;
      if (member.dateOfBirth) updates.date_of_birth = member.dateOfBirth;
      if (member.role) updates.role = member.role;
      if (member.primaryMinistry) updates.primary_ministry = member.primaryMinistry;
      if (member.education) updates.education = member.education;
      if (member.hometown) updates.hometown = member.hometown;
      if (member.occupation) updates.occupation = member.occupation;
      if (member.departments) updates.departments = member.departments;
      if (member.notes) updates.notes = member.notes;
      if (member.emergencyContact) {
        updates.emergency_contact_name = member.emergencyContact.name;
        updates.emergency_contact_phone = member.emergencyContact.phone;
        updates.emergency_contact_relationship = member.emergencyContact.relationship;
      }
      if (member.profileImageUrl !== undefined) {
        updates.profile_image_url = member.profileImageUrl || null;
      }
      if (member.address !== undefined) {
        updates.address = member.address || null;
      }
      if (member.city !== undefined) {
        updates.city = member.city || null;
      }
      if (member.state !== undefined) {
        updates.state = member.state || null;
      }
      if (member.zipCode !== undefined) {
        updates.zip_code = member.zipCode || null;
      }

      const data = await supabaseApi.members.updateMember(String(id), updates);
      return { success: true, data: transformMemberRow(data) };
    } catch (error) {
      console.error(`Failed to update member ${id}:`, error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to update member'),
      };
    }
  },

  /**
   * Upload profile image to Storage (bucket `member-photos`) and save URL on the member row.
   * Only JPEG, PNG, WebP, and GIF files are accepted (max 5 MB enforced by caller).
   */
  async uploadAndSetProfilePhoto(memberId: string, file: File): Promise<ApiResponse<Member>> {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
      };
    }
    try {
      const url = await supabaseApi.storage.uploadMemberProfilePhoto(memberId, file);
      return membersApi.updateMember(memberId, { profileImageUrl: url });
    } catch (error) {
      console.error('Failed to upload profile photo:', error);
      return {
        success: false,
        error: formatSupabaseAccessError(
          error,
          error instanceof Error ? error.message : 'Failed to upload profile photo'
        ),
      };
    }
  },

  /**
   * Delete member
   */
  async deleteMember(id: string): Promise<ApiResponse<void>> {
    try {
      await supabaseApi.members.deleteMember(id);
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete member ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete member',
      };
    }
  },

  /**
   * Get member statistics
   */
  async getMemberStats(): Promise<ApiResponse<{
    totalMembers: number;
    activeMembers: number;
    newThisMonth: number;
    newMembersLastMonth: number;
    averageAge: number;
    visitorCount: number;
    ministryParticipants: number;
  }>> {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const mm = String(m + 1).padStart(2, '0');
      const joinDateFrom = `${y}-${mm}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const joinDateTo = `${y}-${mm}-${String(lastDay).padStart(2, '0')}`;

      const pm0 = m === 0 ? 11 : m - 1;
      const py0 = m === 0 ? y - 1 : y;
      const pmm = String(pm0 + 1).padStart(2, '0');
      const prevJoinFrom = `${py0}-${pmm}-01`;
      const prevLastDay = new Date(py0, pm0 + 1, 0).getDate();
      const prevJoinTo = `${py0}-${pmm}-${String(prevLastDay).padStart(2, '0')}`;

      const [
        totalMembers,
        activeMembers,
        newThisMonth,
        visitorCount,
        dobs,
        newMembersLastMonth,
        ministryParticipants,
      ] = await Promise.all([
        supabaseApi.members.countMembers(),
        supabaseApi.members.countMembers({ status: 'active' }),
        supabaseApi.members.countMembers({ joinDateFrom, joinDateTo }),
        supabaseApi.members.countMembers({ status: 'visitor' }),
        supabaseApi.members.getMembersDateOfBirths(),
        supabaseApi.members.countMembers({
          joinDateFrom: prevJoinFrom,
          joinDateTo: prevJoinTo,
        }),
        supabaseApi.ministries.countMemberMinistryLinks(),
      ]);

      let averageAge = 0;
      const validDobs = (dobs ?? []).filter((d): d is string => Boolean(d));
      if (validDobs.length > 0) {
        const ages = validDobs.map((d) => {
          const birth = new Date(d);
          return (
            (Date.now() - birth.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
          );
        });
        averageAge = Math.round(
          ages.reduce((a, b) => a + b, 0) / ages.length
        );
      }

      return {
        success: true,
        data: {
          totalMembers,
          activeMembers,
          newThisMonth,
          newMembersLastMonth,
          averageAge,
          visitorCount,
          ministryParticipants,
        },
      };
    } catch (error) {
      console.error('Failed to fetch member stats:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch member stats',
        data: {
          totalMembers: 0,
          activeMembers: 0,
          newThisMonth: 0,
          newMembersLastMonth: 0,
          averageAge: 0,
          visitorCount: 0,
          ministryParticipants: 0,
        },
      };
    }
  },

  /**
   * Members with the soonest upcoming birthdays (by calendar date).
   */
  async getUpcomingBirthdays(options?: {
    limit?: number;
    maxDaysAhead?: number;
  }): Promise<ApiResponse<UpcomingBirthday[]>> {
    const limit = options?.limit ?? 10;
    const maxDaysAhead = options?.maxDaysAhead ?? 90;
    try {
      const rows = await supabaseApi.members.getMembersWithDateOfBirth();
      const from = new Date();
      const items: UpcomingBirthday[] = [];

      for (const row of rows) {
        const dob = row.date_of_birth;
        if (!dob || typeof dob !== 'string') continue;
        const isoDob = dob.slice(0, 10);
        const next = getNextBirthdayDate(isoDob, from);
        if (!next) continue;
        const daysUntil = daysBetweenCalendarDates(from, next);
        if (daysUntil > maxDaysAhead) continue;

        const birthY = parseInt(isoDob.slice(0, 4), 10);
        if (Number.isNaN(birthY)) continue;
        const turningAge = next.getFullYear() - birthY;

        const first = (row.first_name || '').trim();
        const last = (row.last_name || '').trim();
        const name = [first, last].filter(Boolean).join(' ') || 'Member';

        items.push({
          id: String(row.id),
          name,
          dateOfBirth: isoDob,
          profileImageUrl: row.profile_image_url || undefined,
          nextBirthdayLabel: next.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          daysUntil,
          turningAge,
        });
      }

      items.sort(
        (a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name)
      );
      return { success: true, data: items.slice(0, limit) };
    } catch (error) {
      console.error('Failed to fetch upcoming birthdays:', error);
      return {
        success: false,
        data: [],
        error: formatSupabaseAccessError(
          error,
          error instanceof Error ? error.message : 'Failed to load birthdays'
        ),
      };
    }
  },

  /**
   * Count members whose join_date falls in [joinDateFrom, joinDateTo] (YYYY-MM-DD)
   */
  async countJoinedBetween(
    joinDateFrom: string,
    joinDateTo: string
  ): Promise<ApiResponse<number>> {
    try {
      const n = await supabaseApi.members.countMembers({
        joinDateFrom,
        joinDateTo,
      });
      return { success: true, data: n };
    } catch (error) {
      console.error('Failed to count members joined in period:', error);
      return {
        success: false,
        data: 0,
        error:
          error instanceof Error ? error.message : 'Failed to count new members',
      };
    }
  },

  /**
   * Age buckets for demographics chart (members with date_of_birth only)
   */
  async getAgeDemographics(): Promise<
    ApiResponse<{ name: string; value: number; color: string }[]>
  > {
    const BUCKETS = [
      { name: 'Children (0–12)', min: 0, max: 12, color: '#f59e0b' },
      { name: 'Youth (13–18)', min: 13, max: 18, color: '#10b981' },
      { name: 'Young Adults (19–35)', min: 19, max: 35, color: '#3b82f6' },
      { name: 'Adults (36–55)', min: 36, max: 55, color: '#8b5cf6' },
      { name: 'Seniors (56+)', min: 56, max: 150, color: '#ec4899' },
    ];

    try {
      const dobs = await supabaseApi.members.getMembersDateOfBirths();
      const counts = BUCKETS.map(() => 0);
      const today = new Date();

      for (const raw of dobs) {
        if (!raw) continue;
        const birth = new Date(raw);
        if (Number.isNaN(birth.getTime())) continue;
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        for (let i = 0; i < BUCKETS.length; i++) {
          const b = BUCKETS[i];
          if (age >= b.min && age <= b.max) {
            counts[i]++;
            break;
          }
        }
      }

      return {
        success: true,
        data: BUCKETS.map((b, i) => ({
          name: b.name,
          value: counts[i],
          color: b.color,
        })),
      };
    } catch (error) {
      console.error('Failed to fetch age demographics:', error);
      return {
        success: false,
        data: BUCKETS.map((b) => ({ name: b.name, value: 0, color: b.color })),
        error:
          error instanceof Error ? error.message : 'Failed to fetch demographics',
      };
    }
  },
};

// ============================================================================
// EVENTS API
// ============================================================================

/**
 * Transform database row to Event interface
 */
function transformEventRow(row: any): Event {
  // Map database status to frontend status
  const statusMap: Record<string, any> = {
    'draft': 'upcoming',
    'published': 'upcoming', // Simple mapping for now
    'completed': 'completed',
    'cancelled': 'cancelled'
  };

  // Map database event_type to frontend type
  const typeMap: Record<string, any> = {
    'service': 'service',
    'meeting': 'other',
    'outreach': 'other',
    'fellowship': 'fellowship',
    'other': 'other'
  };

  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    time: row.start_time,
    location: row.location || '',
    capacity: row.max_attendees || 0,
    attendees: 0, // Would need a separate count query or join
    status: statusMap[row.status] || 'upcoming',
    type: typeMap[row.event_type] || 'other',
    description: row.description,
    ministry: '', // Map from organizer_id or join with ministries table
  };
}

export const eventsApi = {
  /**
   * Fetch all events
   */
  async getEvents(filters?: Record<string, any>): Promise<ApiResponse<Event[]>> {
    try {
      // Map frontend status to database status for filtering
      let dbStatus = filters?.status;
      if (filters?.status === 'upcoming') dbStatus = 'published';
      if (filters?.status === 'ongoing') dbStatus = 'published';

      const { data } = await supabaseApi.events.getEvents({
        limit: filters?.limit,
        offset: filters?.offset,
        status: dbStatus,
        upcoming: filters?.upcoming,
      });

      const rows = data.map(transformEventRow);
      const ids = rows.map((e: { id: string }) => e.id).filter(Boolean);
      let countMap: Record<string, number> = {};
      if (ids.length > 0) {
        try {
          countMap = await supabaseApi.attendance.countPresentByEventIds(ids);
        } catch {
          countMap = {};
        }
      }

      return {
        success: true,
        data: rows.map((e: { id: string; attendees: number }) => ({
          ...e,
          attendees: countMap[e.id] ?? e.attendees,
        })),
      };
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      };
    }
  },

  /**
   * Fetch single event by ID
   */
  async getEvent(id: string | number): Promise<ApiResponse<Event>> {
    try {
      const data = await supabaseApi.events.getEvent(String(id));
      return { success: true, data: transformEventRow(data) };
    } catch (error) {
      console.error(`Failed to fetch event ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch event',
      };
    }
  },

  /**
   * Create new event
   */
  async createEvent(event: Omit<Event, 'id'>): Promise<ApiResponse<Event>> {
    try {
      const user = await supabaseApi.auth.getCurrentUser();
      if (!user) throw new Error('Authentication required to create events');

      // Map frontend types to database types
      const typeMap: Record<string, any> = {
        'service': 'service',
        'youth': 'other', // Database doesn't have 'youth'
        'study': 'other', // Database doesn't have 'study'
        'fellowship': 'fellowship',
        'other': 'other'
      };

      // Map frontend status to database status
      const statusMap: Record<string, any> = {
        'upcoming': 'published',
        'ongoing': 'published',
        'completed': 'completed',
        'cancelled': 'cancelled'
      };

      const eventInsert: any = {
        title: event.title,
        event_date: event.date,
        start_time: event.time,
        location: event.location,
        max_attendees: event.capacity,
        event_type: typeMap[event.type] || 'other',
        status: statusMap[event.status] || 'published',
        organizer_id: user.id,
        description: event.description,
      };

      const data = await supabaseApi.events.createEvent(eventInsert);
      return { success: true, data: transformEventRow(data) };
    } catch (error) {
      console.error('Failed to create event:', error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to create event'),
      };
    }
  },

  /**
   * Update existing event
   */
  async updateEvent(id: string | number, event: Partial<Event>): Promise<ApiResponse<Event>> {
    try {
      // Map frontend types to database types
      const typeMap: Record<string, any> = {
        'service': 'service',
        'youth': 'other',
        'study': 'other',
        'fellowship': 'fellowship',
        'other': 'other'
      };

      // Map frontend status to database status
      const statusMap: Record<string, any> = {
        'upcoming': 'published',
        'ongoing': 'published',
        'completed': 'completed',
        'cancelled': 'cancelled'
      };

      const updates: any = {};
      if (event.title) updates.title = event.title;
      if (event.date) updates.event_date = event.date;
      if (event.time) updates.start_time = event.time;
      if (event.location) updates.location = event.location;
      if (event.capacity) updates.max_attendees = event.capacity;
      if (event.status) updates.status = statusMap[event.status] || 'published';
      if (event.type) updates.event_type = typeMap[event.type] || 'other';
      if (event.description !== undefined) updates.description = event.description;

      const data = await supabaseApi.events.updateEvent(String(id), updates);
      return { success: true, data: transformEventRow(data) };
    } catch (error) {
      console.error(`Failed to update event ${id}:`, error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to update event'),
      };
    }
  },

  /**
   * Delete event
   */
  async deleteEvent(id: string | number): Promise<ApiResponse<void>> {
    try {
      await supabaseApi.events.deleteEvent(String(id));
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete event ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event',
      };
    }
  },

  /**
   * Get event attendees
   */
  async getEventAttendees(eventId: string | number): Promise<ApiResponse<Member[]>> {
    try {
      // This would need a join with the attendance and members table
      const { data } = await supabaseApi.attendance.getAttendance({ eventId: String(eventId) });
      const members = data.map((record: any) => transformMemberRow(record.members));
      return { success: true, data: members };
    } catch (error) {
      console.error(`Failed to fetch event attendees for ${eventId}:`, error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch attendees',
      };
    }
  },
};

// ============================================================================
// ATTENDANCE API
// ============================================================================

/**
 * Transform database row to Attendance interface
 */
function transformAttendanceRow(row: any): Attendance {
  return {
    id: row.id,
    memberId: row.member_id,
    memberName: row.members ? `${row.members.first_name} ${row.members.last_name}` : 'Unknown Member',
    date: row.check_in_time,
    status: row.attendance_status as 'present' | 'absent' | 'late' | 'excused',
    eventId: row.event_id,
    eventName: row.events?.title || 'Unknown Event',
  };
}

export const attendanceApi = {
  /**
   * Fetch attendance records
   */
  async getAttendanceRecords(filters?: Record<string, any>): Promise<ApiResponse<Attendance[]>> {
    try {
      const { data } = await supabaseApi.attendance.getAttendance({
        eventId: filters?.eventId,
        memberId: filters?.memberId,
        date: filters?.date,
        limit: filters?.pageSize || 100,
        offset: filters?.offset || 0,
      });

      return {
        success: true,
        data: data.map(transformAttendanceRow),
      };
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch records',
      };
    }
  },

  /**
   * Record attendance for a member
   */
  async recordAttendance(attendance: Omit<Attendance, 'id'>): Promise<ApiResponse<Attendance>> {
    try {
      const attendanceInsert: any = {
        member_id: attendance.memberId,
        event_id: attendance.eventId,
        attendance_status: attendance.status as 'present' | 'absent' | 'late',
        check_in_time: attendance.date || new Date().toISOString(),
      };

      const data = await supabaseApi.attendance.recordAttendance(attendanceInsert);
      return { success: true, data: transformAttendanceRow(data) };
    } catch (error) {
      console.error('Failed to record attendance:', error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to record attendance'),
      };
    }
  },

  /**
   * Update attendance record
   */
  async updateAttendance(id: string | number, attendance: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
    try {
      const updates: any = {};
      if (attendance.status) updates.attendance_status = attendance.status;
      if (attendance.date) updates.check_in_time = attendance.date;
      if (attendance.eventId) updates.event_id = attendance.eventId;
      if (attendance.memberId) updates.member_id = attendance.memberId;

      const data = await supabaseApi.attendance.updateAttendance(String(id), updates);
      return { success: true, data: transformAttendanceRow(data) };
    } catch (error) {
      console.error(`Failed to update attendance ${id}:`, error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to update attendance'),
      };
    }
  },

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(): Promise<ApiResponse<{
    averageAttendance: number;
    totalAttendees: number;
    attendanceRate: number;
  }>> {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const mm = String(m + 1).padStart(2, '0');
      const thisStart = `${y}-${mm}-01T00:00:00.000Z`;
      const lastD = new Date(y, m + 1, 0).getDate();
      const thisEnd = `${y}-${mm}-${String(lastD).padStart(2, '0')}T23:59:59.999Z`;

      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      const pmm = String(pm + 1).padStart(2, '0');
      const lastStart = `${py}-${pmm}-01T00:00:00.000Z`;
      const lastDayPrev = new Date(py, pm + 1, 0).getDate();
      const lastEnd = `${py}-${pmm}-${String(lastDayPrev).padStart(2, '0')}T23:59:59.999Z`;

      const [presentThis, presentLast] = await Promise.all([
        supabaseApi.attendance.countAttendance({
          status: 'present',
          checkInFrom: thisStart,
          checkInTo: thisEnd,
        }),
        supabaseApi.attendance.countAttendance({
          status: 'present',
          checkInFrom: lastStart,
          checkInTo: lastEnd,
        }),
      ]);

      return {
        success: true,
        data: {
          averageAttendance: presentThis,
          totalAttendees: presentThis,
          attendanceRate:
            presentLast > 0
              ? Math.round(
                  ((presentThis - presentLast) / presentLast) * 100
                )
              : presentThis > 0
                ? 100
                : 0,
        },
      };
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
      return {
        success: false,
        data: {
          averageAttendance: 0,
          totalAttendees: 0,
          attendanceRate: 0,
        },
      };
    }
  },

  /**
   * Count present check-ins with check_in_time in [dateFrom, dateTo] (YYYY-MM-DD, local calendar day as UTC bounds)
   */
  async countPresentBetween(
    dateFrom: string,
    dateTo: string
  ): Promise<ApiResponse<number>> {
    try {
      const from = `${dateFrom}T00:00:00.000Z`;
      const to = `${dateTo}T23:59:59.999Z`;
      const n = await supabaseApi.attendance.countAttendance({
        status: 'present',
        checkInFrom: from,
        checkInTo: to,
      });
      return { success: true, data: n };
    } catch (error) {
      console.error('Failed to count attendance in period:', error);
      return {
        success: false,
        data: 0,
        error:
          error instanceof Error ? error.message : 'Failed to count attendance',
      };
    }
  },

  /**
   * Monthly present / late counts for charts (calendar year)
   */
  async getMonthlyAttendanceTrend(
    year?: number
  ): Promise<
    ApiResponse<{ name: string; attendance: number; visitors: number }[]>
  > {
    const y = year ?? new Date().getFullYear();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    try {
      const rows = await supabaseApi.attendance.listCheckInsForYear(y);
      const present = Array(12).fill(0) as number[];
      const late = Array(12).fill(0) as number[];

      for (const row of rows) {
        const d = new Date(row.check_in_time);
        if (d.getFullYear() !== y) continue;
        const mo = d.getMonth();
        if (row.attendance_status === 'present') present[mo]++;
        else if (row.attendance_status === 'late') late[mo]++;
      }

      return {
        success: true,
        data: monthNames.map((name, i) => ({
          name,
          attendance: present[i],
          visitors: late[i],
        })),
      };
    } catch (error) {
      console.error('Failed to fetch attendance trend:', error);
      return {
        success: false,
        data: monthNames.map((name) => ({
          name,
          attendance: 0,
          visitors: 0,
        })),
        error:
          error instanceof Error ? error.message : 'Failed to fetch attendance trend',
      };
    }
  },

  async getPresentCountsByEventIds(
    eventIds: string[]
  ): Promise<ApiResponse<Record<string, number>>> {
    try {
      const map = await supabaseApi.attendance.countPresentByEventIds(eventIds);
      return { success: true, data: map };
    } catch (error) {
      console.error('Failed to fetch event attendance counts:', error);
      return {
        success: false,
        data: {},
        error:
          error instanceof Error ? error.message : 'Failed to fetch counts',
      };
    }
  },
};

// ============================================================================
// DONATIONS API
// ============================================================================

/**
 * Transform database row to Donation interface
 */
function transformDonationRow(row: any): Donation {
  // Smart categorization based on context and existing data
  const getFundCategory = (fundType: string, notes: string = ''): string => {
    // New categories (now supported after migration - case-insensitive match)
    const normalizedFund = fundType.toLowerCase();
    if (normalizedFund === 'tithes') return 'Tithes';
    if (normalizedFund === 'offering') return 'Offering';
    if (normalizedFund === 'thanksgiving') return 'Thanksgiving';
    if (normalizedFund === 'prophetic_seed' || normalizedFund === 'prophetic seed') return 'Prophetic Seed';
    if (normalizedFund === 'special_project' || normalizedFund === 'special project') return 'Special Project';
    if (normalizedFund === 'wednesday_service' || normalizedFund === 'wednesday service') return 'Wednesday Service';
    if (normalizedFund === 'conference') return 'Conference';
    
    // Existing database mappings
    if (normalizedFund === 'building' || normalizedFund === 'building fund') return 'Building Fund';
    if (normalizedFund === 'missions') return 'Missions';
    
    // Smart categorization for legacy data
    if (normalizedFund === 'general') {
      // Check notes for category clues
      const lowerNotes = notes.toLowerCase();
      if (lowerNotes.includes('tithe') || lowerNotes.includes('tithes')) return 'Tithes';
      if (lowerNotes.includes('thank') || lowerNotes.includes('thanksgiving')) return 'Thanksgiving';
      if (lowerNotes.includes('prophetic') || lowerNotes.includes('seed')) return 'Prophetic Seed';
      if (lowerNotes.includes('building') || lowerNotes.includes('project')) return 'Building Fund';
      
      // Default to Offering for general
      return 'Offering';
    }
    
    // Other legacy types
    if (['youth', 'children', 'benevolence', 'music'].includes(normalizedFund)) {
      return 'Offering';
    }
    
    // Default for 'other' or unknown
    return 'Others';
  };

  // Map database payment method slugs back to display labels
  const methodMap: Record<string, string> = {
    'online': 'Online',
    'check': 'Check',
    'cash': 'Cash',
    'card': 'Card',
    'bank_transfer': 'Bank Transfer',
    'other': 'Other',
  };

  return {
    id: row.id,
    donorId: row.donor_id || undefined,
    donorName: row.donor_name || undefined,
    donorEmail: row.donor_email || undefined,
    amount: Number(row.amount),
    date: row.donation_date,
    paymentMethod: methodMap[row.payment_method] || row.payment_method || 'Other',
    fundType: getFundCategory(row.fund_type, row.notes || ''),
    isRecurring: row.is_recurring || false,
    recurringFrequency: row.recurring_frequency || undefined,
    notes: row.notes || '',
    reference: row.payment_reference || '',
    receiptNumber: row.receipt_number || '',
  };
}

/**
 * Map display labels to database slugs
 */
function mapDonationToDb(donation: Partial<Donation>): any {
  const fundMap: Record<string, string> = {
    // New categories (now supported after migration - mapping to slugs in DB)
    'Tithes': 'tithes',
    'Offering': 'offering',
    'Thanksgiving': 'thanksgiving',
    'Prophetic Seed': 'prophetic_seed',
    'Building Fund': 'building',
    'Missions': 'missions',
    'Special Project': 'special_project',
    'Wednesday Service': 'offering', // Map to offering if no specific slug
    'Conference': 'other', // Map to other if no specific slug
    'Others': 'other',
    'Other': 'other',
    // Legacy mappings for backward compatibility
    'General Fund': 'offering',
    'Youth Ministry': 'offering',
    'Children\'s Ministry': 'offering',
    'Benevolence': 'offering',
    'Music Ministry': 'offering',
  };

  const methodMap: Record<string, string> = {
    'Online': 'online',
    'Check': 'check',
    'Cash': 'cash',
    'Card': 'card',
    'Bank Transfer': 'bank_transfer',
    'Other': 'other',
  };

  const dbObj: any = {};
  if (donation.donorId) dbObj.donor_id = donation.donorId;
  if (donation.donorName) dbObj.donor_name = donation.donorName;
  if (donation.donorEmail) dbObj.donor_email = donation.donorEmail;
  if (donation.amount) dbObj.amount = donation.amount;
  if (donation.date) dbObj.donation_date = donation.date;
  if (donation.paymentMethod) dbObj.payment_method = methodMap[donation.paymentMethod] || 'other';
  if (donation.fundType) dbObj.fund_type = fundMap[donation.fundType] || 'offering';
  if (donation.isRecurring !== undefined) dbObj.is_recurring = donation.isRecurring;
  if (donation.recurringFrequency) dbObj.recurring_frequency = donation.recurringFrequency.toLowerCase();
  if (donation.notes) dbObj.notes = donation.notes;
  if (donation.receiptNumber) dbObj.receipt_number = donation.receiptNumber;
  if (donation.reference) dbObj.payment_reference = donation.reference;

  return dbObj;
}

export const donationsApi = {
  /**
   * Fetch donation records
   */
  async getDonations(options?: {
    donorId?: string;
    fundType?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Donation>> {
    try {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      const offset = (page - 1) * pageSize;

      // Map fundType if provided (backward compatibility and case mapping)
      const fundMap: Record<string, string> = {
        'General Fund': 'offering',
        'Building Fund': 'building',
        'Missions': 'missions',
        'Youth Ministry': 'offering',
        'Children\'s Ministry': 'offering',
        'Tithes': 'tithes',
        'Offering': 'offering',
        'Thanksgiving': 'thanksgiving',
        'Prophetic Seed': 'prophetic_seed',
        'Special Project': 'special_project',
        'Wednesday Service': 'offering',
        'Conference': 'other',
        'Others': 'other',
        'Other': 'other',
      };
      const methodMap: Record<string, string> = {
        'Online': 'online',
        'Check': 'check',
        'Cash': 'cash',
        'Card': 'card',
        'Bank Transfer': 'bank_transfer',
        'Other': 'other',
      };
      
      const queryOptions = {
        ...options,
        fundType: options?.fundType ? (fundMap[options.fundType] || options.fundType) : undefined,
        paymentMethod: options?.paymentMethod ? (methodMap[options.paymentMethod] || options.paymentMethod.toLowerCase()) : undefined,
        limit: pageSize,
        offset,
      };

      const { data, count } = await supabaseApi.donations.getDonations(queryOptions);

      return {
        success: true,
        data: data.map(transformDonationRow),
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      };
    } catch (error) {
      console.error('Failed to fetch donations:', error);
      return {
        success: false,
        total: 0,
        page: options?.page || 1,
        pageSize: options?.pageSize || 10,
        totalPages: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch donations',
      };
    }
  },

  /**
   * Create donation record
   */
  async createDonation(donation: Omit<Donation, 'id'>): Promise<ApiResponse<Donation>> {
    try {
      const donationInsert = mapDonationToDb(donation);
      const created = await supabaseApi.donations.createDonation(donationInsert);
      const transformed = transformDonationRow(created);
      // Attempt audit log (may fail due to RLS)
      try {
        await supabaseApi.audit.insert({
          table_name: 'donations',
          record_id: created.id,
          action: 'INSERT',
          old_values: null,
          new_values: created,
          changed_fields: null,
        });
      } catch (auditErr) {
        console.warn('Audit log insert failed:', auditErr);
      }
      return { success: true, data: transformed };
    } catch (error) {
      console.error('Failed to create donation:', error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to create donation'),
      };
    }
  },

  /**
   * Update donation record
   */
  async updateDonation(id: string, donation: Partial<Donation>): Promise<ApiResponse<Donation>> {
    try {
      // Fetch old row for audit comparison
      let oldRow: any = null;
      try {
        oldRow = await supabaseApi.donations.getDonation(id);
      } catch (e) {
        // ignore fetch error for audit
      }
      const updates = mapDonationToDb(donation);
      const updated = await supabaseApi.donations.updateDonation(id, updates);
      const transformed = transformDonationRow(updated);
      // Attempt audit log (may fail due to RLS)
      try {
        const changedFields =
          oldRow && updated
            ? Object.keys(updated as any).filter((k) => JSON.stringify((oldRow as any)?.[k]) !== JSON.stringify((updated as any)?.[k]))
            : null;
        await supabaseApi.audit.insert({
          table_name: 'donations',
          record_id: id,
          action: 'UPDATE',
          old_values: oldRow,
          new_values: updated,
          changed_fields: changedFields && changedFields.length > 0 ? changedFields : null,
        });
      } catch (auditErr) {
        console.warn('Audit log insert failed:', auditErr);
      }
      return { success: true, data: transformed };
    } catch (error) {
      console.error(`Failed to update donation ${id}:`, error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to update donation'),
      };
    }
  },

  /**
   * Delete donation record
   */
  async deleteDonation(id: string): Promise<ApiResponse<void>> {
    try {
      // Fetch old row for audit logging
      let oldRow: any = null;
      try {
        oldRow = await supabaseApi.donations.getDonation(id);
      } catch (e) {
        // ignore fetch error for audit
      }
      await supabaseApi.donations.deleteDonation(id);
      // Attempt audit log (may fail due to RLS)
      try {
        await supabaseApi.audit.insert({
          table_name: 'donations',
          record_id: id,
          action: 'DELETE',
          old_values: oldRow,
          new_values: null,
          changed_fields: null,
        });
      } catch (auditErr) {
        console.warn('Audit log insert failed:', auditErr);
      }
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete donation ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete donation',
      };
    }
  },

  /**
   * Get donation statistics
   */
  async getDonationStats(): Promise<ApiResponse<{
    totalDonations: number;
    averageDonation: number;
    topDonor: string;
    monthlyTrend: { name: string; amount: number }[];
  }>> {
    try {
      const { data } = await supabaseApi.donations.getDonations({
        limit: 15000,
        offset: 0,
      });

      const rows = (data || []).map(transformDonationRow);
      const totalDonations = rows.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
      const n = rows.length;
      const averageDonation = n > 0 ? Math.round(totalDonations / n) : 0;

      const byDonor = new Map<string, number>();
      for (const r of rows) {
        const key = r.donorName || r.donorEmail || 'Anonymous';
        byDonor.set(key, (byDonor.get(key) || 0) + Number(r.amount));
      }
      let topDonor = '';
      let topAmt = 0;
      for (const [name, amt] of byDonor) {
        if (amt > topAmt) {
          topAmt = amt;
          topDonor = name;
        }
      }

      const monthTotals = new Map<number, number>();
      for (const r of rows) {
        const d = new Date(r.date);
        if (Number.isNaN(d.getTime())) continue;
        const mk = d.getFullYear() * 12 + d.getMonth();
        monthTotals.set(mk, (monthTotals.get(mk) || 0) + Number(r.amount));
      }
      const labels = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const now = new Date();
      const y = now.getFullYear();
      const monthlyTrend = labels.map((name, i) => ({
        name,
        amount: monthTotals.get(y * 12 + i) || 0,
      }));

      return {
        success: true,
        data: {
          totalDonations,
          averageDonation,
          topDonor,
          monthlyTrend,
        },
      };
    } catch (error) {
      console.error('Failed to fetch donation stats:', error);
      return {
        success: false,
        data: {
          totalDonations: 0,
          averageDonation: 0,
          topDonor: '',
          monthlyTrend: [],
        },
      };
    }
  },
};

// ============================================================================
// SERMONS API
// ============================================================================

/**
 * Transform database row to Sermon interface
 */
function transformSermonRow(row: any): Sermon {
  return {
    id: row.id,
    title: row.title,
    speaker: row.speaker,
    date: row.sermon_date,
    duration: row.duration_minutes || 0,
    ministry: '', // Need to join with ministries table
    videoUrl: row.video_url || undefined,
    audioUrl: row.audio_url || undefined,
  };
}

export const sermonsApi = {
  /**
   * Fetch all sermons
   */
  async getSermons(filters?: Record<string, any>): Promise<ApiResponse<Sermon[]>> {
    try {
      const { data } = await supabaseApi.sermons.getSermons({
        limit: filters?.limit,
        offset: filters?.offset,
        ministryId: filters?.ministryId,
        search: filters?.search,
      });

      return { success: true, data: data.map(transformSermonRow) };
    } catch (error) {
      console.error('Failed to fetch sermons:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch sermons',
      };
    }
  },

  /**
   * Fetch single sermon by ID
   */
  async getSermon(id: string | number): Promise<ApiResponse<Sermon>> {
    try {
      const data = await supabaseApi.sermons.getSermon(String(id));
      return { success: true, data: transformSermonRow(data) };
    } catch (error) {
      console.error(`Failed to fetch sermon ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sermon',
      };
    }
  },

  /**
   * Create new sermon
   */
  async createSermon(sermon: Omit<Sermon, 'id'>): Promise<ApiResponse<Sermon>> {
    try {
      const sermonInsert: any = {
        title: sermon.title,
        speaker: sermon.speaker,
        sermon_date: sermon.date,
        duration_minutes: sermon.duration,
        video_url: sermon.videoUrl,
        audio_url: sermon.audioUrl,
      };

      const data = await supabaseApi.sermons.createSermon(sermonInsert);
      return { success: true, data: transformSermonRow(data) };
    } catch (error) {
      console.error('Failed to create sermon:', error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to create sermon'),
      };
    }
  },

  /**
   * Update existing sermon
   */
  async updateSermon(id: string | number, sermon: Partial<Sermon>): Promise<ApiResponse<Sermon>> {
    try {
      const updates: any = {};
      if (sermon.title) updates.title = sermon.title;
      if (sermon.speaker) updates.speaker = sermon.speaker;
      if (sermon.date) updates.sermon_date = sermon.date;
      if (sermon.duration) updates.duration_minutes = sermon.duration;
      if (sermon.videoUrl !== undefined) updates.video_url = sermon.videoUrl;
      if (sermon.audioUrl !== undefined) updates.audio_url = sermon.audioUrl;

      const data = await supabaseApi.sermons.updateSermon(String(id), updates);
      return { success: true, data: transformSermonRow(data) };
    } catch (error) {
      console.error(`Failed to update sermon ${id}:`, error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to update sermon'),
      };
    }
  },

  /**
   * Delete sermon
   */
  async deleteSermon(id: string | number): Promise<ApiResponse<void>> {
    try {
      await supabaseApi.sermons.deleteSermon(String(id));
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete sermon ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete sermon',
      };
    }
  },
};

// ============================================================================
// ANNOUNCEMENTS API
// ============================================================================

// ============================================================================
// ANNOUNCEMENTS API
// ============================================================================

/**
 * Transform database row to Announcement interface
 */
function transformAnnouncementRow(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdDate: row.published_date,
    expiryDate: row.expiry_date || undefined,
    priority: row.priority as 'low' | 'medium' | 'high',
    category: row.category,
    authorId: row.author_id || 0,
  };
}

export const announcementsApi = {
  /**
   * Fetch all announcements
   */
  async getAnnouncements(filters?: Record<string, any>): Promise<ApiResponse<Announcement[]>> {
    try {
      const { data } = await supabaseApi.announcements.getAnnouncements({
        limit: filters?.limit,
        offset: filters?.offset,
        category: filters?.category,
        activeOnly: filters?.activeOnly,
      });

      return { success: true, data: data.map(transformAnnouncementRow) };
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch announcements',
      };
    }
  },

  /**
   * Create new announcement
   */
  async createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdDate'>): Promise<ApiResponse<Announcement>> {
    try {
      const announcementInsert: any = {
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        category: announcement.category,
        published_date: new Date().toISOString(),
        is_active: true,
      };

      const data = await supabaseApi.announcements.createAnnouncement(announcementInsert);
      return { success: true, data: transformAnnouncementRow(data) };
    } catch (error) {
      console.error('Failed to create announcement:', error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to create announcement'),
      };
    }
  },

  /**
   * Update announcement
   */
  async updateAnnouncement(id: string | number, announcement: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    try {
      const updates: any = {};
      if (announcement.title) updates.title = announcement.title;
      if (announcement.content) updates.content = announcement.content;
      if (announcement.priority) updates.priority = announcement.priority;
      if (announcement.category) updates.category = announcement.category;
      if (announcement.expiryDate) updates.expiry_date = announcement.expiryDate;

      const data = await supabaseApi.announcements.updateAnnouncement(String(id), updates);
      return { success: true, data: transformAnnouncementRow(data) };
    } catch (error) {
      console.error(`Failed to update announcement ${id}:`, error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to update announcement'),
      };
    }
  },

  /**
   * Delete announcement
   */
  async deleteAnnouncement(id: string | number): Promise<ApiResponse<void>> {
    try {
      await supabaseApi.announcements.deleteAnnouncement(String(id));
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete announcement ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete announcement',
      };
    }
  },
};

// ============================================================================
// REPORTS API
// ============================================================================

// ============================================================================
// REPORTS API
// ============================================================================

/**
 * Transform database row to Report interface
 */
function transformReportRow(row: any): Report {
  return {
    id: row.id,
    name: row.name,
    type: row.type as 'attendance' | 'donations' | 'membership' | 'ministry',
    generatedDate: row.generated_date,
    period: row.period || '',
    data: (row.data as Record<string, unknown>) || {},
  };
}

export const reportsApi = {
  /**
   * Fetch all reports
   */
  async getReports(filters?: Record<string, any>): Promise<ApiResponse<Report[]>> {
    try {
      const { data } = await supabaseApi.reports.getReports({
        limit: filters?.limit,
        offset: filters?.offset,
        type: filters?.type,
      });

      return { success: true, data: data.map(transformReportRow) };
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch reports',
      };
    }
  },

  /**
   * Generate new report
   */
  async generateReport(type: Report['type'], period: string): Promise<ApiResponse<Report>> {
    try {
      const reportInsert: any = {
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${period}`,
        type,
        period,
        generated_date: new Date().toISOString(),
        data: {}, // In a real app, this would be populated by a backend process or function
        is_scheduled: false,
      };

      const data = await supabaseApi.reports.createReport(reportInsert);
      return { success: true, data: transformReportRow(data) };
    } catch (error) {
      console.error('Failed to generate report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      };
    }
  },
};

// ============================================================================
// SETTINGS API
// ============================================================================

// ============================================================================
// SETTINGS API
// ============================================================================

/**
 * Transform database row to Settings interface
 */
function transformSettingsRow(row: any): Settings {
  return {
    churchName: row.church_name,
    churchEmail: row.church_email || '',
    churchPhone: row.church_phone || '',
    churchAddress: row.church_address || '',
    timeZone: row.time_zone,
    currency: row.currency,
    notificationsEnabled: row.notifications_enabled,
    language: row.language,
  };
}

export const settingsApi = {
  /**
   * Fetch application settings
   */
  async getSettings(): Promise<ApiResponse<Settings>> {
    try {
      const data = await supabaseApi.settings.getSettings();
      return { success: true, data: transformSettingsRow(data) };
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
      };
    }
  },

  /**
   * Update settings
   */
  async updateSettings(settings: Partial<Settings>): Promise<ApiResponse<Settings>> {
    try {
      const updates: any = {};
      if (settings.churchName) updates.church_name = settings.churchName;
      if (settings.churchEmail) updates.church_email = settings.churchEmail;
      if (settings.churchPhone) updates.church_phone = settings.churchPhone;
      if (settings.churchAddress) updates.church_address = settings.churchAddress;
      if (settings.timeZone) updates.time_zone = settings.timeZone;
      if (settings.currency) updates.currency = settings.currency;
      if (settings.notificationsEnabled !== undefined) updates.notifications_enabled = settings.notificationsEnabled;
      if (settings.language) updates.language = settings.language;

      const data = await supabaseApi.settings.updateSettings(updates);
      return { success: true, data: transformSettingsRow(data) };
    } catch (error) {
      console.error('Failed to update settings:', error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to update settings'),
      };
    }
  },
};

// ============================================================================
// AUTHENTICATION API (Supabase integration)
// ============================================================================

export const authApi = {
  /**
   * Login user
   */
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: Member }>> {
    try {
      const signInData = await supabaseApi.auth.signIn(email, password);

      // supabaseApi.auth.signIn returns { user, session } from signInWithPassword
      const su = signInData?.user;
      const sess = signInData?.session;

      const user: Member = {
        id: su?.id || '',
        name: `${su?.user_metadata?.first_name || ''} ${su?.user_metadata?.last_name || ''}`.trim() || su?.email || '',
        email: su?.email || '',
        phone: su?.user_metadata?.phone || '',
        status: 'active',
        role: su?.user_metadata?.role || 'member',
        primaryMinistry: su?.user_metadata?.primary_ministry || '',
        joinDate: su?.created_at || '',
        dateOfBirth: su?.user_metadata?.date_of_birth || '',
        departments: su?.user_metadata?.departments || [],
      };

      return {
        success: true,
        data: {
          token: sess?.access_token || '',
          user
        }
      };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      await supabaseApi.auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  },

  /**
   * Update password
   */
  async updatePassword(password: string): Promise<ApiResponse<void>> {
    try {
      await supabaseApi.auth.updatePassword(password);
      return { success: true };
    } catch (error) {
      console.error('Password update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password update failed',
      };
    }
  },

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<ApiResponse<void>> {
    try {
      await supabaseApi.auth.resetPassword(email);
      return { success: true };
    } catch (error) {
      console.error('Password reset failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      };
    }
  },

  async isStaffOrAdmin(): Promise<ApiResponse<{ isStaffOrAdmin: boolean }>> {
    try {
      const isStaffOrAdmin = await supabaseApi.auth.isStaffOrAdmin();
      return { success: true, data: { isStaffOrAdmin } };
    } catch (error) {
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to check permissions'),
      };
    }
  },

  /**
   * Verify token
   */
  async verifyToken(): Promise<ApiResponse<{ valid: boolean; user?: Member }>> {
    try {
      const user = await supabaseApi.auth.getCurrentUser();
      if (!user) {
        return {
          success: true,
          data: { valid: false },
        };
      }

      const member: Member = {
        id: user.id || '',
        name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        status: 'active',
        role: user.user_metadata?.role || 'member',
        primaryMinistry: user.user_metadata?.primary_ministry || '',
        joinDate: user.created_at || '',
        dateOfBirth: user.user_metadata?.date_of_birth || '',
        departments: user.user_metadata?.departments || [],
      };

      return {
        success: true,
        data: { valid: true, user: member },
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return {
        success: true,
        data: { valid: false },
      };
    }
  },
};

// ============================================================================
// MINISTRIES API
// ============================================================================

export const ministriesApi = {
  async listWithMemberCounts(): Promise<
    ApiResponse<{ id: string; name: string; memberCount: number }[]>
  > {
    try {
      const data = await supabaseApi.ministries.listActiveWithMemberCounts();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to fetch ministries:', error);
      return {
        success: false,
        data: [],
        error:
          error instanceof Error ? error.message : 'Failed to fetch ministries',
      };
    }
  },
};

// ============================================================================
// EXPENSES API
// ============================================================================

/**
 * Transform database row to Expense interface
 */
function transformExpenseRow(row: any): Expense {
  return {
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    date: row.expense_date,
    category: row.category,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    vendorName: row.vendor_name,
    vendorContact: row.vendor_contact,
    budgetCategory: row.budget_category,
    isApproved: row.is_approved,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    receiptUrl: row.receipt_url,
    notes: row.notes,
    isRecurring: row.is_recurring || false,
    recurringFrequency: row.recurring_frequency,
  };
}

export const expensesApi = {
  /**
   * Fetch expense records
   */
  async getExpenses(options?: {
    category?: string;
    vendorName?: string;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
    isApproved?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Expense>> {
    try {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      const offset = (page - 1) * pageSize;

      const { data, count } = await supabaseApi.expenses.getExpenses({
        ...options,
        limit: pageSize,
        offset,
      });

      return {
        success: true,
        data: data.map(transformExpenseRow),
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize),
      };
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      return {
        success: false,
        total: 0,
        page: options?.page || 1,
        pageSize: options?.pageSize || 10,
        totalPages: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch expenses',
      };
    }
  },

  /**
   * Create expense record
   */
  async createExpense(expense: Omit<Expense, 'id'>): Promise<ApiResponse<Expense>> {
    try {
      const created = await supabaseApi.expenses.createExpense({
        description: expense.description,
        amount: expense.amount,
        expense_date: expense.date,
        category: expense.category,
        payment_method: expense.paymentMethod,
        payment_reference: expense.paymentReference,
        vendor_name: expense.vendorName,
        vendor_contact: expense.vendorContact,
        budget_category: expense.budgetCategory,
        is_approved: expense.isApproved,
        notes: expense.notes,
        is_recurring: expense.isRecurring,
        recurring_frequency: expense.recurringFrequency,
        receipt_url: expense.receiptUrl,
      });
      
      const transformed = transformExpenseRow(created);
      
      // Attempt audit log
      try {
        await supabaseApi.audit.insert({
          table_name: 'expenses',
          record_id: created.id,
          action: 'INSERT',
          old_values: null,
          new_values: created,
          changed_fields: null,
        });
      } catch (auditErr) {
        console.warn('Audit log insert failed:', auditErr);
      }
      
      return { success: true, data: transformed };
    } catch (error) {
      console.error('Failed to create expense:', error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to create expense'),
      };
    }
  },

  /**
   * Update expense record
   */
  async updateExpense(id: string, expense: Partial<Expense>): Promise<ApiResponse<Expense>> {
    try {
      let oldRow: any = null;
      try {
        oldRow = await supabaseApi.expenses.getExpense(id);
      } catch (e) {
        // ignore fetch error for audit
      }
      
      const updates: any = {};
      if (expense.description) updates.description = expense.description;
      if (expense.amount !== undefined) updates.amount = expense.amount;
      if (expense.date) updates.expense_date = expense.date;
      if (expense.category) updates.category = expense.category;
      if (expense.paymentMethod) updates.payment_method = expense.paymentMethod;
      if (expense.paymentReference !== undefined) updates.payment_reference = expense.paymentReference;
      if (expense.vendorName !== undefined) updates.vendor_name = expense.vendorName;
      if (expense.vendorContact !== undefined) updates.vendor_contact = expense.vendorContact;
      if (expense.budgetCategory !== undefined) updates.budget_category = expense.budgetCategory;
      if (expense.isApproved !== undefined) updates.is_approved = expense.isApproved;
      if (expense.notes !== undefined) updates.notes = expense.notes;
      if (expense.isRecurring !== undefined) updates.is_recurring = expense.isRecurring;
      if (expense.recurringFrequency) updates.recurring_frequency = expense.recurringFrequency;
      if (expense.receiptUrl !== undefined) updates.receipt_url = expense.receiptUrl;
      
      const updated = await supabaseApi.expenses.updateExpense(id, updates);
      const transformed = transformExpenseRow(updated);
      
      // Attempt audit log
      try {
        const changedFields =
          oldRow && updated
            ? Object.keys(updated as any).filter((k) => JSON.stringify((oldRow as any)?.[k]) !== JSON.stringify((updated as any)?.[k]))
            : null;
        await supabaseApi.audit.insert({
          table_name: 'expenses',
          record_id: id,
          action: 'UPDATE',
          old_values: oldRow,
          new_values: updated,
          changed_fields: changedFields && changedFields.length > 0 ? changedFields : null,
        });
      } catch (auditErr) {
        console.warn('Audit log insert failed:', auditErr);
      }
      
      return { success: true, data: transformed };
    } catch (error) {
      console.error(`Failed to update expense ${id}:`, error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to update expense'),
      };
    }
  },

  /**
   * Delete expense record
   */
  async deleteExpense(id: string): Promise<ApiResponse<void>> {
    try {
      let oldRow: any = null;
      try {
        oldRow = await supabaseApi.expenses.getExpense(id);
      } catch (e) {
        // ignore fetch error for audit
      }
      
      await supabaseApi.expenses.deleteExpense(id);
      
      // Attempt audit log
      try {
        await supabaseApi.audit.insert({
          table_name: 'expenses',
          record_id: id,
          action: 'DELETE',
          old_values: oldRow,
          new_values: null,
          changed_fields: null,
        });
      } catch (auditErr) {
        console.warn('Audit log insert failed:', auditErr);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Failed to delete expense ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete expense',
      };
    }
  },

  /**
   * Approve expense
   */
  async approveExpense(id: string): Promise<ApiResponse<Expense>> {
    try {
      const approved = await supabaseApi.expenses.approveExpense(id);
      const transformed = transformExpenseRow(approved);
      return { success: true, data: transformed };
    } catch (error) {
      console.error(`Failed to approve expense ${id}:`, error);
      return {
        success: false,
        error: formatSupabaseAccessError(error, 'Failed to approve expense'),
      };
    }
  },

  /**
   * Get expense statistics
   */
  async getExpenseStats(options?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<{
    totalExpenses: number;
    approvedExpenses: number;
    pendingExpenses: number;
    categoryTotals: Record<string, number>;
    expenseCount: number;
  }>> {
    try {
      const stats = await supabaseApi.expenses.getExpenseStats(options);
      return { success: true, data: stats };
    } catch (error) {
      console.error('Failed to fetch expense stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expense statistics',
      };
    }
  },
};

// ============================================================================
// EXPORT API NAMESPACE
// ============================================================================

export const api = {
  members: membersApi,
  events: eventsApi,
  attendance: attendanceApi,
  donations: donationsApi,
  ministries: ministriesApi,
  sermons: sermonsApi,
  announcements: announcementsApi,
  reports: reportsApi,
  settings: settingsApi,
  auth: authApi,
  expenses: expensesApi,
};

export default api;
