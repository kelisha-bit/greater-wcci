// Supabase Database Types
// This file should be generated from your Supabase schema
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          first_name: string
          last_name: string
          email: string
          phone?: string
          date_of_birth?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          membership_status: 'active' | 'inactive' | 'visitor'
          join_date: string
          baptism_date?: string
          marital_status?: 'single' | 'married' | 'divorced' | 'widowed'
          occupation?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          profile_image_url?: string
          notes?: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name: string
          last_name: string
          email: string
          phone?: string
          date_of_birth?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          membership_status?: 'active' | 'inactive' | 'visitor'
          join_date?: string
          baptism_date?: string
          marital_status?: 'single' | 'married' | 'divorced' | 'widowed'
          occupation?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          profile_image_url?: string
          notes?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          date_of_birth?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          membership_status?: 'active' | 'inactive' | 'visitor'
          join_date?: string
          baptism_date?: string
          marital_status?: 'single' | 'married' | 'divorced' | 'widowed'
          occupation?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          profile_image_url?: string
          notes?: string
        }
      }
      events: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description?: string
          event_date: string
          start_time: string
          end_time?: string
          location?: string
          event_type: 'service' | 'meeting' | 'outreach' | 'fellowship' | 'other'
          max_attendees?: number
          is_recurring: boolean
          recurrence_pattern?: string
          organizer_id: string
          status: 'draft' | 'published' | 'cancelled' | 'completed'
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string
          event_date: string
          start_time: string
          end_time?: string
          location?: string
          event_type?: 'service' | 'meeting' | 'outreach' | 'fellowship' | 'other'
          max_attendees?: number
          is_recurring?: boolean
          recurrence_pattern?: string
          organizer_id: string
          status?: 'draft' | 'published' | 'cancelled' | 'completed'
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string
          event_date?: string
          start_time?: string
          end_time?: string
          location?: string
          event_type?: 'service' | 'meeting' | 'outreach' | 'fellowship' | 'other'
          max_attendees?: number
          is_recurring?: boolean
          recurrence_pattern?: string
          organizer_id?: string
          status?: 'draft' | 'published' | 'cancelled' | 'completed'
        }
      }
      // Add more table definitions as needed...
      attendance: {
        Row: {
          id: string
          member_id: string
          event_id: string
          check_in_time: string
          check_out_time?: string
          attendance_status: 'present' | 'absent' | 'late'
          notes?: string
        }
        Insert: {
          id?: string
          member_id: string
          event_id: string
          check_in_time?: string
          check_out_time?: string
          attendance_status?: 'present' | 'absent' | 'late'
          notes?: string
        }
        Update: {
          id?: string
          member_id?: string
          event_id?: string
          check_in_time?: string
          check_out_time?: string
          attendance_status?: 'present' | 'absent' | 'late'
          notes?: string
        }
      }
      donations: {
        Row: {
          id: string
          donor_id?: string
          donor_name?: string
          donor_email?: string
          amount: number
          donation_date: string
          payment_method: 'cash' | 'check' | 'card' | 'online' | 'bank_transfer' | 'other'
          payment_reference?: string
          fund_type: 'general' | 'building' | 'missions' | 'benevolence' | 'youth' | 'children' | 'music' | 'other'
          is_recurring: boolean
          recurring_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          notes?: string
          receipt_number?: string
          is_tax_deductible: boolean
          recorded_by?: string
          updated_by?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          donor_id?: string
          donor_name?: string
          donor_email?: string
          amount: number
          donation_date?: string
          payment_method?: 'cash' | 'check' | 'card' | 'online' | 'bank_transfer' | 'other'
          payment_reference?: string
          fund_type?: 'general' | 'building' | 'missions' | 'benevolence' | 'youth' | 'children' | 'music' | 'other'
          is_recurring?: boolean
          recurring_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          notes?: string
          receipt_number?: string
          is_tax_deductible?: boolean
          recorded_by?: string
          updated_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          donor_id?: string
          donor_name?: string
          donor_email?: string
          amount?: number
          donation_date?: string
          payment_method?: 'cash' | 'check' | 'card' | 'online' | 'bank_transfer' | 'other'
          payment_reference?: string
          fund_type?: 'general' | 'building' | 'missions' | 'benevolence' | 'youth' | 'children' | 'music' | 'other'
          is_recurring?: boolean
          recurring_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          notes?: string
          receipt_number?: string
          is_tax_deductible?: boolean
          recorded_by?: string
          updated_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      ministries: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          description?: string
          leader_id?: string
          category: 'worship' | 'outreach' | 'fellowship' | 'education' | 'children' | 'youth' | 'senior' | 'other'
          is_active: boolean
          created_by?: string
          updated_by?: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          description?: string
          leader_id?: string
          category?: 'worship' | 'outreach' | 'fellowship' | 'education' | 'children' | 'youth' | 'senior' | 'other'
          is_active?: boolean
          created_by?: string
          updated_by?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          description?: string
          leader_id?: string
          category?: 'worship' | 'outreach' | 'fellowship' | 'education' | 'children' | 'youth' | 'senior' | 'other'
          is_active?: boolean
          created_by?: string
          updated_by?: string
        }
      }
      member_ministries: {
        Row: {
          id: string
          created_at: string
          member_id: string
          ministry_id: string
          role: 'leader' | 'member' | 'volunteer'
          joined_date: string
        }
        Insert: {
          id?: string
          created_at?: string
          member_id: string
          ministry_id: string
          role?: 'leader' | 'member' | 'volunteer'
          joined_date?: string
        }
        Update: {
          id?: string
          created_at?: string
          member_id?: string
          ministry_id?: string
          role?: 'leader' | 'member' | 'volunteer'
          joined_date?: string
        }
      }
      event_registrations: {
        Row: {
          id: string
          created_at: string
          event_id: string
          member_id: string
          registration_date: string
          status: 'registered' | 'confirmed' | 'cancelled' | 'attended'
          notes?: string
        }
        Insert: {
          id?: string
          created_at?: string
          event_id: string
          member_id: string
          registration_date?: string
          status?: 'registered' | 'confirmed' | 'cancelled' | 'attended'
          notes?: string
        }
        Update: {
          id?: string
          created_at?: string
          event_id?: string
          member_id?: string
          registration_date?: string
          status?: 'registered' | 'confirmed' | 'cancelled' | 'attended'
          notes?: string
        }
      }
      sermons: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          speaker: string
          speaker_id?: string
          sermon_date: string
          service_time?: string
          duration_minutes?: number
          ministry_id?: string
          series_title?: string
          scripture_reference?: string
          description?: string
          key_verse?: string
          video_url?: string
          audio_url?: string
          transcript_url?: string
          notes_url?: string
          tags: string[] | null
          is_featured: boolean
          view_count: number
          created_by?: string
          updated_by?: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          speaker: string
          speaker_id?: string
          sermon_date?: string
          service_time?: string
          duration_minutes?: number
          ministry_id?: string
          series_title?: string
          scripture_reference?: string
          description?: string
          key_verse?: string
          video_url?: string
          audio_url?: string
          transcript_url?: string
          notes_url?: string
          tags?: string[] | null
          is_featured?: boolean
          view_count?: number
          created_by?: string
          updated_by?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          speaker?: string
          speaker_id?: string
          sermon_date?: string
          service_time?: string
          duration_minutes?: number
          ministry_id?: string
          series_title?: string
          scripture_reference?: string
          description?: string
          key_verse?: string
          video_url?: string
          audio_url?: string
          transcript_url?: string
          notes_url?: string
          tags?: string[] | null
          is_featured?: boolean
          view_count?: number
          created_by?: string
          updated_by?: string
        }
      }
      announcements: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          content: string
          priority: 'low' | 'medium' | 'high' | 'urgent'
          category: 'general' | 'event' | 'ministry' | 'urgent' | 'spiritual' | 'other'
          is_active: boolean
          published_date: string
          expiry_date?: string
          target_ministries: string[] | null
          target_audience: 'all' | 'members_only' | 'staff_only' | 'ministry_specific'
          contact_name?: string
          contact_email?: string
          contact_phone?: string
          author_id?: string
          created_by?: string
          updated_by?: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          content: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          category?: 'general' | 'event' | 'ministry' | 'urgent' | 'spiritual' | 'other'
          is_active?: boolean
          published_date?: string
          expiry_date?: string
          target_ministries?: string[] | null
          target_audience?: 'all' | 'members_only' | 'staff_only' | 'ministry_specific'
          contact_name?: string
          contact_email?: string
          contact_phone?: string
          author_id?: string
          created_by?: string
          updated_by?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          content?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          category?: 'general' | 'event' | 'ministry' | 'urgent' | 'spiritual' | 'other'
          is_active?: boolean
          published_date?: string
          expiry_date?: string
          target_ministries?: string[] | null
          target_audience?: 'all' | 'members_only' | 'staff_only' | 'ministry_specific'
          contact_name?: string
          contact_email?: string
          contact_phone?: string
          author_id?: string
          created_by?: string
          updated_by?: string
        }
      }
      reports: {
        Row: {
          id: string
          created_at: string
          name: string
          type: 'attendance' | 'donations' | 'membership' | 'ministry' | 'financial' | 'custom'
          description?: string
          parameters: Json
          generated_date: string
          start_date?: string
          end_date?: string
          period?: string
          data: Json
          summary: Json
          generated_by?: string
          file_url?: string
          is_scheduled: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          type: 'attendance' | 'donations' | 'membership' | 'ministry' | 'financial' | 'custom'
          description?: string
          parameters?: Json
          generated_date?: string
          start_date?: string
          end_date?: string
          period?: string
          data?: Json
          summary?: Json
          generated_by?: string
          file_url?: string
          is_scheduled?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          type?: 'attendance' | 'donations' | 'membership' | 'ministry' | 'financial' | 'custom'
          description?: string
          parameters?: Json
          generated_date?: string
          start_date?: string
          end_date?: string
          period?: string
          data?: Json
          summary?: Json
          generated_by?: string
          file_url?: string
          is_scheduled?: boolean
        }
      }
      settings: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          church_name: string
          church_email?: string
          church_phone?: string
          church_address?: string
          church_city?: string
          church_state?: string
          church_zip_code?: string
          church_website?: string
          time_zone: string
          currency: string
          language: string
          notifications_enabled: boolean
          email_notifications: boolean
          sms_notifications: boolean
          push_notifications: boolean
          default_service_time?: string
          membership_fee: number
          donation_tax_deductible: boolean
          maintenance_mode: boolean
          maintenance_message?: string
          updated_by?: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          church_name?: string
          church_email?: string
          church_phone?: string
          church_address?: string
          church_city?: string
          church_state?: string
          church_zip_code?: string
          church_website?: string
          time_zone?: string
          currency?: string
          language?: string
          notifications_enabled?: boolean
          email_notifications?: boolean
          sms_notifications?: boolean
          push_notifications?: boolean
          default_service_time?: string
          membership_fee?: number
          donation_tax_deductible?: boolean
          maintenance_mode?: boolean
          maintenance_message?: string
          updated_by?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          church_name?: string
          church_email?: string
          church_phone?: string
          church_address?: string
          church_city?: string
          church_state?: string
          church_zip_code?: string
          church_website?: string
          time_zone?: string
          currency?: string
          language?: string
          notifications_enabled?: boolean
          email_notifications?: boolean
          sms_notifications?: boolean
          push_notifications?: boolean
          default_service_time?: string
          membership_fee?: number
          donation_tax_deductible?: boolean
          maintenance_mode?: boolean
          maintenance_message?: string
          updated_by?: string
        }
      }
      file_attachments: {
        Row: {
          id: string
          created_at: string
          file_name: string
          file_path: string
          file_size?: number
          mime_type?: string
          bucket_name: string
          member_id?: string
          event_id?: string
          sermon_id?: string
          announcement_id?: string
          category: 'profile' | 'event' | 'sermon' | 'announcement' | 'document' | 'other'
          description?: string
          uploaded_by?: string
        }
        Insert: {
          id?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          mime_type?: string
          bucket_name: string
          member_id?: string
          event_id?: string
          sermon_id?: string
          announcement_id?: string
          category?: 'profile' | 'event' | 'sermon' | 'announcement' | 'document' | 'other'
          description?: string
          uploaded_by?: string
        }
        Update: {
          id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          bucket_name?: string
          member_id?: string
          event_id?: string
          sermon_id?: string
          announcement_id?: string
          category?: 'profile' | 'event' | 'sermon' | 'announcement' | 'document' | 'other'
          description?: string
          uploaded_by?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          created_at: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values: Json
          new_values: Json
          changed_fields: string[] | null
          user_id?: string
          ip_address?: string
          user_agent?: string
        }
        Insert: {
          id?: string
          created_at?: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values?: Json
          new_values?: Json
          changed_fields?: string[] | null
          user_id?: string
          ip_address?: string
          user_agent?: string
        }
        Update: {
          id?: string
          created_at?: string
          table_name?: string
          record_id?: string
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_values?: Json
          new_values?: Json
          changed_fields?: string[] | null
          user_id?: string
          ip_address?: string
          user_agent?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          created_at: string
          user_id: string
          role: 'admin' | 'staff' | 'member' | 'guest'
          permissions: Json
          assigned_by?: string
          assigned_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          role?: 'admin' | 'staff' | 'member' | 'guest'
          permissions?: Json
          assigned_by?: string
          assigned_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          role?: 'admin' | 'staff' | 'member' | 'guest'
          permissions?: Json
          assigned_by?: string
          assigned_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      membership_status: 'active' | 'inactive' | 'visitor'
      marital_status: 'single' | 'married' | 'divorced' | 'widowed'
      event_type: 'service' | 'meeting' | 'outreach' | 'fellowship' | 'conference' | 'workshop' | 'other'
      event_status: 'draft' | 'published' | 'cancelled' | 'completed'
      attendance_status: 'present' | 'absent' | 'late' | 'excused'
      payment_method: 'cash' | 'check' | 'card' | 'online' | 'bank_transfer' | 'other'
      fund_type: 'general' | 'building' | 'missions' | 'benevolence' | 'youth' | 'children' | 'music' | 'other'
      ministry_category: 'worship' | 'outreach' | 'fellowship' | 'education' | 'children' | 'youth' | 'senior' | 'other'
      member_ministry_role: 'leader' | 'member' | 'volunteer'
      registration_status: 'registered' | 'confirmed' | 'cancelled' | 'attended'
      announcement_priority: 'low' | 'medium' | 'high' | 'urgent'
      announcement_category: 'general' | 'event' | 'ministry' | 'urgent' | 'spiritual' | 'other'
      target_audience: 'all' | 'members_only' | 'staff_only' | 'ministry_specific'
      report_type: 'attendance' | 'donations' | 'membership' | 'ministry' | 'financial' | 'custom'
      file_category: 'profile' | 'event' | 'sermon' | 'announcement' | 'document' | 'other'
      user_role: 'admin' | 'staff' | 'member' | 'guest'
      audit_action: 'INSERT' | 'UPDATE' | 'DELETE'
    }
  }
}