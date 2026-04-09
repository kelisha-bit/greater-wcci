/**
 * Supabase API Service Layer
 * ChurchApp API implementation using Supabase client
 * Provides all CRUD operations for church management features
 */

import { supabase } from './supabaseClient'
import type { Database } from '@/types/supabase'

/** Must match bucket created in supabase_storage_member_photos.sql */
export const MEMBER_PHOTOS_BUCKET = 'member-photos'

function profilePhotoExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  const mime = file.type.split('/')[1]?.toLowerCase()
  if (mime === 'jpeg' || mime === 'jpg') return 'jpg'
  if (mime === 'png' || mime === 'gif' || mime === 'webp') return mime
  return 'jpg'
}

// Type aliases for easier use
type Tables = Database['public']['Tables']
type MemberRow = Tables['members']['Row']
type MemberInsert = Tables['members']['Insert']
type MemberUpdate = Tables['members']['Update']
type EventRow = Tables['events']['Row']
type EventInsert = Tables['events']['Insert']
type EventUpdate = Tables['events']['Update']
type AttendanceRow = Tables['attendance']['Row']
type AttendanceInsert = Tables['attendance']['Insert']
type AttendanceUpdate = Tables['attendance']['Update']
type DonationRow = Tables['donations']['Row']
type DonationInsert = Tables['donations']['Insert']
type DonationUpdate = Tables['donations']['Update']
type SermonRow = Tables['sermons']['Row']
type SermonInsert = Tables['sermons']['Insert']
type SermonUpdate = Tables['sermons']['Update']
type AnnouncementRow = Tables['announcements']['Row']
type AnnouncementInsert = Tables['announcements']['Insert']
type AnnouncementUpdate = Tables['announcements']['Update']
type ReportRow = Tables['reports']['Row']
type ReportInsert = Tables['reports']['Insert']
type SettingRow = Tables['settings']['Row']
type SettingUpdate = Tables['settings']['Update']

function localDayBoundsIso(dateStr: string): { start: string; endExclusive: string } {
  // Interpret YYYY-MM-DD as a local calendar day, then convert that local midnight range
  // into ISO instants for querying timestamptz columns.
  const [y, m, d] = dateStr.split('-').map(Number)
  const startLocal = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
  const endLocal = new Date(startLocal)
  endLocal.setDate(startLocal.getDate() + 1)
  return { start: startLocal.toISOString(), endExclusive: endLocal.toISOString() }
}

function isoToLocalYyyyMmDd(iso: string): string {
  const dt = new Date(iso)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const supabaseAuthApi = {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  },

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    if (error) throw error
    return data
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  },

  /**
   * Update password
   */
  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({
      password
    })
    if (error) throw error
  },

  /**
   * Check if current user is a staff member or admin
   */
  async isStaffOrAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const metadataRoleRaw = user.app_metadata?.role || user.user_metadata?.role
    const metadataRole = typeof metadataRoleRaw === 'string' ? metadataRoleRaw.toLowerCase() : metadataRoleRaw
    if (metadataRole === 'admin' || metadataRole === 'staff') return true

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error checking user role:', error)
      return false
    }

    const dbRole = typeof data?.role === 'string' ? data.role.toLowerCase() : data?.role
    return dbRole === 'admin' || dbRole === 'staff'
  },

  async getRoleFlags(): Promise<{
    role: 'admin' | 'staff' | 'member' | 'guest'
    isAdmin: boolean
    isStaff: boolean
    isAdminOrStaff: boolean
  }> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        role: 'guest',
        isAdmin: false,
        isStaff: false,
        isAdminOrStaff: false
      }
    }

    const metadataRoleRaw = user.app_metadata?.role || user.user_metadata?.role
    const metadataRole = (typeof metadataRoleRaw === 'string'
      ? metadataRoleRaw.toLowerCase()
      : metadataRoleRaw) as
        | 'admin'
        | 'staff'
        | 'member'
        | 'guest'
        | undefined

    let dbRole: 'admin' | 'staff' | 'member' | 'guest' | null = null

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!error && data?.role) {
      const normalized = typeof data.role === 'string' ? data.role.toLowerCase() : data.role
      dbRole = normalized as 'admin' | 'staff' | 'member' | 'guest'
    }

    const effectiveRole: 'admin' | 'staff' | 'member' | 'guest' =
      dbRole || metadataRole || 'member'

    const isAdmin = effectiveRole === 'admin'
    const isStaff = effectiveRole === 'staff'

    return {
      role: effectiveRole,
      isAdmin,
      isStaff,
      isAdminOrStaff: isAdmin || isStaff
    }
  }
}

// ============================================================================
// MEMBERS API
// ============================================================================

export const supabaseMembersApi = {
  /**
   * Get all members with optional filtering
   */
  async getMembers(options?: {
    limit?: number
    offset?: number
    status?: string
    search?: string
  }) {
    let query = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (options?.status) {
      query = query.eq('membership_status', options.status)
    }

    if (options?.search) {
      query = query.or(`first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`)
    }

    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Get single member by ID
   */
  async getMember(id: string): Promise<MemberRow> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get current user's member profile
   */
  async getCurrentUserProfile(): Promise<MemberRow> {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('email', user.email)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create new member
   */
  async createMember(member: MemberInsert): Promise<MemberRow> {
    const { data, error } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update member
   */
  async updateMember(id: string, updates: MemberUpdate): Promise<MemberRow> {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete member
   */
  async deleteMember(id: string) {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Count members (head request — no row payload)
   */
  async countMembers(filters?: {
    status?: 'active' | 'inactive' | 'visitor'
    joinDateFrom?: string
    joinDateTo?: string
  }): Promise<number> {
    let query = supabase
      .from('members')
      .select('*', { count: 'exact', head: true })

    if (filters?.status) {
      query = query.eq('membership_status', filters.status)
    }
    if (filters?.joinDateFrom) {
      query = query.gte('join_date', filters.joinDateFrom)
    }
    if (filters?.joinDateTo) {
      query = query.lte('join_date', filters.joinDateTo)
    }

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  },

  /**
   * Date of birth values only (for average age)
   */
  async getMembersDateOfBirths(): Promise<(string | null)[]> {
    const { data, error } = await supabase.from('members').select('date_of_birth')

    if (error) throw error
    return (data ?? []).map((r: { date_of_birth: string | null }) => r.date_of_birth)
  },

  /** Members with a stored date of birth (minimal columns for birthday lists). */
  async getMembersWithDateOfBirth(): Promise<
    Pick<
      MemberRow,
      'id' | 'first_name' | 'last_name' | 'date_of_birth' | 'profile_image_url'
    >[]
  > {
    const { data, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, date_of_birth, profile_image_url')
      .not('date_of_birth', 'is', null)

    if (error) throw error
    return data ?? []
  },
}

// ============================================================================
// EVENTS API
// ============================================================================

export const supabaseEventsApi = {
  /**
   * Get all events
   */
  async getEvents(options?: {
    limit?: number
    offset?: number
    status?: string
    upcoming?: boolean
  }) {
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .order('event_date', { ascending: true })

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.upcoming) {
      query = query.gte('event_date', new Date().toISOString().split('T')[0])
    }

    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Get single event
   */
  async getEvent(id: string): Promise<EventRow> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create new event
   */
  async createEvent(event: EventInsert): Promise<EventRow> {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update event
   */
  async updateEvent(id: string, updates: EventUpdate): Promise<EventRow> {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete event
   */
  async deleteEvent(id: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// ============================================================================
// ATTENDANCE API
// ============================================================================

export const supabaseAttendanceApi = {
  /**
   * Get attendance records
   */
  async getAttendance(options?: {
    eventId?: string
    memberId?: string
    date?: string
    limit?: number
    offset?: number
  }) {
    let query = supabase
      .from('attendance')
      .select(`
        *,
        members!inner(first_name, last_name, email),
        events!inner(title, event_date)
      `, { count: 'exact' })

    if (options?.eventId) {
      query = query.eq('event_id', options.eventId)
    }

    if (options?.memberId) {
      query = query.eq('member_id', options.memberId)
    }

    if (options?.date) {
      const { start, endExclusive } = localDayBoundsIso(options.date)
      query = query.gte('check_in_time', start).lt('check_in_time', endExclusive)
    }

    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Record attendance with conflict handling
   */
  async recordAttendance(attendance: AttendanceInsert): Promise<AttendanceRow> {
    // First, try to find an existing record for this member+event on the same local day.
    // (Exact timestamp matches are too strict and allow duplicates that break reporting.)
    const localDay = attendance.check_in_time
      ? isoToLocalYyyyMmDd(String(attendance.check_in_time))
      : isoToLocalYyyyMmDd(new Date().toISOString())
    const { start, endExclusive } = localDayBoundsIso(localDay)

    const { data: existing, error: fetchError } = await supabase
      .from('attendance')
      .select()
      .eq('member_id', attendance.member_id)
      .eq('event_id', attendance.event_id)
      .gte('check_in_time', start)
      .lt('check_in_time', endExclusive)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    // If record exists, update it instead of creating duplicate
    if (existing) {
      return this.updateAttendance(existing.id, {
        attendance_status: attendance.attendance_status,
        check_in_time: attendance.check_in_time,
      })
    }

    // Otherwise, insert new record
    const { data, error } = await supabase
      .from('attendance')
      .insert(attendance)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update attendance
   */
  async updateAttendance(id: string, updates: AttendanceUpdate): Promise<AttendanceRow> {
    const { data, error } = await supabase
      .from('attendance')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /** Head count for dashboard stats */
  async countAttendance(filters: {
    status?: string
    checkInFrom?: string
    checkInTo?: string
  }): Promise<number> {
    let query = supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })

    if (filters.status) {
      query = query.eq('attendance_status', filters.status)
    }
    if (filters.checkInFrom) {
      query = query.gte('check_in_time', filters.checkInFrom)
    }
    if (filters.checkInTo) {
      query = query.lte('check_in_time', filters.checkInTo)
    }

    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  },

  /** Year slice for monthly charts (local year via check_in_time) */
  async listCheckInsForYear(year: number): Promise<
    { check_in_time: string; attendance_status: string }[]
  > {
    const from = `${year}-01-01T00:00:00.000Z`
    const to = `${year}-12-31T23:59:59.999Z`
    const { data, error } = await supabase
      .from('attendance')
      .select('check_in_time, attendance_status')
      .gte('check_in_time', from)
      .lte('check_in_time', to)

    if (error) throw error
    return data || []
  },

  async countPresentByEventIds(eventIds: string[]): Promise<Record<string, number>> {
    if (eventIds.length === 0) return {}
    const { data, error } = await supabase
      .from('attendance')
      .select('event_id')
      .in('event_id', eventIds)
      .eq('attendance_status', 'present')

    if (error) throw error
    const map: Record<string, number> = {}
    for (const id of eventIds) map[id] = 0
    for (const row of data || []) {
      const eid = row.event_id as string
      map[eid] = (map[eid] || 0) + 1
    }
    return map
  },
}

// ============================================================================
// DONATIONS API
// ============================================================================

export const supabaseDonationsApi = {
  /**
   * Get donations
   */
  async getDonations(options?: {
    donorId?: string
    fundType?: string
    paymentMethod?: string
    dateFrom?: string
    dateTo?: string
    amountMin?: number
    amountMax?: number
    limit?: number
    offset?: number
  }) {
    let query = supabase
      .from('donations')
      .select('*', { count: 'exact' })
      .order('donation_date', { ascending: false })

    if (options?.donorId) {
      query = query.eq('donor_id', options.donorId)
    }

    if (options?.fundType) {
      query = query.eq('fund_type', options.fundType)
    }

    if (options?.paymentMethod) {
      query = query.eq('payment_method', options.paymentMethod)
    }

    if (options?.dateFrom) {
      query = query.gte('donation_date', options.dateFrom)
    }

    if (options?.dateTo) {
      query = query.lte('donation_date', options.dateTo)
    }

    if (options?.amountMin !== undefined) {
      query = query.gte('amount', options.amountMin)
    }

    if (options?.amountMax !== undefined) {
      query = query.lte('amount', options.amountMax)
    }

    if (options?.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Get single donation by ID
   */
  async getDonation(id: string) {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create donation
   */
  async createDonation(donation: DonationInsert): Promise<DonationRow> {
    const { data, error } = await supabase
      .from('donations')
      .insert(donation)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update donation
   */
  async updateDonation(id: string, updates: DonationUpdate): Promise<DonationRow> {
    const { data, error } = await supabase
      .from('donations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete donation
   */
  async deleteDonation(id: string) {
    const { error } = await supabase
      .from('donations')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// ============================================================================
// AUDIT LOG API
// ============================================================================

export const supabaseAuditApi = {
  /**
   * Insert an audit log entry (may be restricted by RLS; errors should be handled by caller)
   */
  async insert(entry: {
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_values?: any
    new_values?: any
    changed_fields?: string[] | null
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? null

    const { error } = await supabase
      .from('audit_log')
      .insert({
        table_name: entry.table_name,
        record_id: entry.record_id,
        action: entry.action,
        old_values: entry.old_values ?? null,
        new_values: entry.new_values ?? null,
        changed_fields: entry.changed_fields ?? null,
        user_id: userId
      })
    if (error) throw error
  }
}

// ============================================================================
// SERMONS API
// ============================================================================

export const supabaseSermonsApi = {
  /**
   * Get all sermons
   */
  async getSermons(options?: {
    limit?: number
    offset?: number
    ministryId?: string
    search?: string
  }) {
    let query = supabase
      .from('sermons')
      .select('*', { count: 'exact' })
      .order('sermon_date', { ascending: false })

    if (options?.ministryId) {
      query = query.eq('ministry_id', options.ministryId)
    }

    if (options?.search) {
      query = query.or(`title.ilike.%${options.search}%,speaker.ilike.%${options.search}%`)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Get single sermon
   */
  async getSermon(id: string): Promise<SermonRow> {
    const { data, error } = await supabase
      .from('sermons')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create new sermon
   */
  async createSermon(sermon: SermonInsert): Promise<SermonRow> {
    const { data, error } = await supabase
      .from('sermons')
      .insert(sermon)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update sermon
   */
  async updateSermon(id: string, updates: SermonUpdate): Promise<SermonRow> {
    const { data, error } = await supabase
      .from('sermons')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete sermon
   */
  async deleteSermon(id: string) {
    const { error } = await supabase
      .from('sermons')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// ============================================================================
// ANNOUNCEMENTS API
// ============================================================================

export const supabaseAnnouncementsApi = {
  /**
   * Get all announcements
   */
  async getAnnouncements(options?: {
    limit?: number
    offset?: number
    category?: string
    activeOnly?: boolean
  }) {
    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })
      .order('published_date', { ascending: false })

    if (options?.category) {
      query = query.eq('category', options.category)
    }

    if (options?.activeOnly) {
      query = query.eq('is_active', true)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Create new announcement
   */
  async createAnnouncement(announcement: AnnouncementInsert): Promise<AnnouncementRow> {
    const { data, error } = await supabase
      .from('announcements')
      .insert(announcement)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update announcement
   */
  async updateAnnouncement(id: string, updates: AnnouncementUpdate): Promise<AnnouncementRow> {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete announcement
   */
  async deleteAnnouncement(id: string) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// ============================================================================
// REPORTS API
// ============================================================================

export const supabaseReportsApi = {
  /**
   * Get all reports
   */
  async getReports(options?: {
    limit?: number
    offset?: number
    type?: string
  }) {
    let query = supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .order('generated_date', { ascending: false })

    if (options?.type) {
      query = query.eq('type', options.type)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Create report record
   */
  async createReport(report: ReportInsert): Promise<ReportRow> {
    const { data, error } = await supabase
      .from('reports')
      .insert(report)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ============================================================================
// SETTINGS API
// ============================================================================

export const supabaseSettingsApi = {
  /**
   * Get settings - returns default settings if none exist
   */
  async getSettings(): Promise<SettingRow> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)

    if (error) throw error

    // Return default settings if none exist
    if (!data || data.length === 0) {
      return {
        id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        church_name: 'ChurchApp',
        church_email: undefined,
        church_phone: undefined,
        church_address: undefined,
        church_city: undefined,
        church_state: undefined,
        church_zip_code: undefined,
        church_website: undefined,
        time_zone: 'America/New_York',
        currency: 'USD',
        language: 'en',
        notifications_enabled: true,
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        default_service_time: '10:00',
        membership_fee: 0,
        donation_tax_deductible: true,
        maintenance_mode: false,
        maintenance_message: undefined,
        updated_by: undefined,
      } as SettingRow
    }
    return data[0]
  },

  /**
   * Update settings - creates default settings if none exist
   */
  async updateSettings(updates: SettingUpdate): Promise<SettingRow> {
    // Check if settings exist (get first row only)
    const { data: rows, error: fetchError } = await supabase
      .from('settings')
      .select('id')
      .limit(1)

    if (fetchError) throw fetchError

    const current = rows?.[0]

    if (!current?.id) {
      // No settings exist - create default settings first
      const { data: newSettings, error: insertError } = await supabase
        .from('settings')
        .insert({
          church_name: 'ChurchApp',
          time_zone: 'America/New_York',
          currency: 'USD',
          language: 'en',
          ...updates,
        })
        .select()
        .limit(1)

      if (insertError) throw insertError
      return newSettings[0]
    }

    // Update existing settings (only the first row)
    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', current.id)
      .select()
      .limit(1)

    if (error) throw error
    return data[0]
  }
}

// ============================================================================
// MINISTRIES API
// ============================================================================

export const supabaseMinistriesApi = {
  async listActiveWithMemberCounts(): Promise<
    { id: string; name: string; memberCount: number }[]
  > {
    const { data: mins, error } = await supabase
      .from('ministries')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    // If the ministries table has rows, use the relational member_ministries counts
    if (mins && mins.length > 0) {
      const { data: links, error: linkErr } = await supabase
        .from('member_ministries')
        .select('ministry_id')

      if (linkErr) throw linkErr

      const counts = new Map<string, number>()
      for (const row of links || []) {
        const id = row.ministry_id as string
        counts.set(id, (counts.get(id) || 0) + 1)
      }

      return mins.map((m: { id: string; name: string }) => ({
        id: m.id,
        name: m.name,
        memberCount: counts.get(m.id) || 0,
      }))
    }

    // Fallback: aggregate primary_ministry directly from the members table
    const { data: members, error: membersErr } = await supabase
      .from('members')
      .select('primary_ministry')
      .not('primary_ministry', 'is', null)
      .neq('primary_ministry', '')

    if (membersErr) throw membersErr

    const counts = new Map<string, number>()
    for (const row of members || []) {
      const name = row.primary_ministry as string
      if (name) counts.set(name, (counts.get(name) || 0) + 1)
    }

    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, memberCount]) => ({
        id: name, // use name as synthetic id since there's no ministries row
        name,
        memberCount,
      }))
  },

  async countMemberMinistryLinks(): Promise<number> {
    const { count, error } = await supabase
      .from('member_ministries')
      .select('*', { count: 'exact', head: true })

    if (error) throw error
    return count ?? 0
  },

  async getMinistriesByNames(names: string[]): Promise<{ id: string; name: string }[]> {
    if (!names.length) return []

    const { data, error } = await supabase
      .from('ministries')
      .select('id, name')
      .in('name', names)

    if (error) throw error
    return data || []
  },

  async getMemberMinistries(memberId: string): Promise<
    {
      id: string
      memberId: string
      ministryId: string
      ministryName: string
      role: 'leader' | 'member' | 'volunteer'
      joinedDate: string
    }[]
  > {
    const { data: links, error } = await supabase
      .from('member_ministries')
      .select('id, member_id, ministry_id, role, joined_date')
      .eq('member_id', memberId)

    if (error) throw error
    if (!links || links.length === 0) return []

    const ministryIds = Array.from(new Set(links.map((link: { ministry_id: string }) => link.ministry_id)))
    const { data: ministries, error: ministriesError } = await supabase
      .from('ministries')
      .select('id, name')
      .in('id', ministryIds)

    if (ministriesError) throw ministriesError
    const ministryMap = new Map((ministries || []).map((item: { id: string; name: string }) => [item.id, item.name]))

    return links.map((link: { id: string; member_id: string; ministry_id: string; role: 'leader' | 'member' | 'volunteer'; joined_date: string }) => ({
      id: link.id,
      memberId: link.member_id,
      ministryId: link.ministry_id,
      ministryName: ministryMap.get(link.ministry_id) || '',
      role: link.role,
      joinedDate: link.joined_date,
    }))
  },

  async addMemberToMinistry(link: {
    memberId: string
    ministryId: string
    role?: 'leader' | 'member' | 'volunteer'
    joinedDate?: string
  }): Promise<{
    id: string
    memberId: string
    ministryId: string
    role: 'leader' | 'member' | 'volunteer'
    joinedDate: string
  }> {
    const { data, error } = await supabase
      .from('member_ministries')
      .insert({
        member_id: link.memberId,
        ministry_id: link.ministryId,
        role: link.role || 'member',
        joined_date: link.joinedDate || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      memberId: data.member_id,
      ministryId: data.ministry_id,
      role: data.role,
      joinedDate: data.joined_date,
    }
  },

  async removeMemberFromMinistry(memberId: string, ministryId: string): Promise<void> {
    const { error } = await supabase
      .from('member_ministries')
      .delete()
      .eq('member_id', memberId)
      .eq('ministry_id', ministryId)

    if (error) throw error
  },
}

// ============================================================================
// STORAGE API
// ============================================================================

export const supabaseStorageApi = {
  /**
   * Upload/replace profile image; returns public URL for members.profile_image_url
   */
  async uploadMemberProfilePhoto(memberId: string, file: File): Promise<string> {
    const ext = profilePhotoExtension(file)
    const path = `${memberId}/profile.${ext}`
    const contentType =
      file.type || (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)

    const { error } = await supabase.storage
      .from(MEMBER_PHOTOS_BUCKET)
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType,
      })

    if (error) throw error

    const { data } = supabase.storage
      .from(MEMBER_PHOTOS_BUCKET)
      .getPublicUrl(path)

    return data.publicUrl
  },
}

// ============================================================================
// EXPENSES API
// ============================================================================

export const supabaseExpensesApi = {
  /**
   * Get all expenses with optional filtering
   */
  async getExpenses(options?: {
    limit?: number
    offset?: number
    category?: string
    vendorName?: string
    dateFrom?: string
    dateTo?: string
    amountMin?: number
    amountMax?: number
    isApproved?: boolean
    search?: string
  }) {
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .order('expense_date', { ascending: false })

    if (options?.category) {
      query = query.eq('category', options.category)
    }

    if (options?.vendorName) {
      query = query.ilike('vendor_name', `%${options.vendorName}%`)
    }

    if (options?.dateFrom) {
      query = query.gte('expense_date', options.dateFrom)
    }

    if (options?.dateTo) {
      query = query.lte('expense_date', options.dateTo)
    }

    if (options?.amountMin !== undefined) {
      query = query.gte('amount', options.amountMin)
    }

    if (options?.amountMax !== undefined) {
      query = query.lte('amount', options.amountMax)
    }

    if (options?.isApproved !== undefined) {
      query = query.eq('is_approved', options.isApproved)
    }

    if (options?.search) {
      query = query.or(`description.ilike.%${options.search}%,vendor_name.ilike.%${options.search}%`)
    }

    if (options?.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data || [], count: count || 0 }
  },

  /**
   * Get single expense by ID
   */
  async getExpense(id: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create new expense
   */
  async createExpense(expense: {
    description: string
    amount: number
    expense_date: string
    category?: string
    payment_method?: string
    payment_reference?: string
    vendor_name?: string
    vendor_contact?: string
    budget_category?: string
    is_approved?: boolean
    notes?: string
    is_recurring?: boolean
    recurring_frequency?: string
    receipt_url?: string
  }) {
    const user = await supabaseAuthApi.getCurrentUser()
    
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...expense,
        recorded_by: user?.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update expense
   */
  async updateExpense(id: string, updates: {
    description?: string
    amount?: number
    expense_date?: string
    category?: string
    payment_method?: string
    payment_reference?: string
    vendor_name?: string
    vendor_contact?: string
    budget_category?: string
    is_approved?: boolean
    approved_by?: string
    approved_at?: string
    notes?: string
    is_recurring?: boolean
    recurring_frequency?: string
    receipt_url?: string
  }) {
    const user = await supabaseAuthApi.getCurrentUser()
    
    const { data, error } = await supabase
      .from('expenses')
      .update({
        ...updates,
        updated_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete expense
   */
  async deleteExpense(id: string) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Approve expense
   */
  async approveExpense(id: string) {
    const user = await supabaseAuthApi.getCurrentUser()
    
    const { data, error } = await supabase
      .from('expenses')
      .update({
        is_approved: true,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        updated_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get expense statistics
   */
  async getExpenseStats(options?: {
    dateFrom?: string
    dateTo?: string
  }) {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, category, expense_date, is_approved')
      .gte('expense_date', options?.dateFrom || '1900-01-01')
      .lte('expense_date', options?.dateTo || '2100-12-31')

    if (error) throw error

    const totalExpenses = data?.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0) || 0
    const approvedExpenses = data?.filter((e: { is_approved: boolean }) => e.is_approved).reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0) || 0
    const pendingExpenses = totalExpenses - approvedExpenses

    const categoryTotals: Record<string, number> = {}
    data?.forEach((e: { category: string; amount: number }) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount)
    })

    return {
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      categoryTotals,
      expenseCount: data?.length || 0,
    }
  },
}

// ============================================================================
// MAIN API EXPORT
// ============================================================================

export const supabaseApi = {
  auth: supabaseAuthApi,
  members: supabaseMembersApi,
  events: supabaseEventsApi,
  attendance: supabaseAttendanceApi,
  donations: supabaseDonationsApi,
  audit: supabaseAuditApi,
  ministries: supabaseMinistriesApi,
  sermons: supabaseSermonsApi,
  announcements: supabaseAnnouncementsApi,
  reports: supabaseReportsApi,
  settings: supabaseSettingsApi,
  storage: supabaseStorageApi,
  expenses: supabaseExpensesApi,
}
