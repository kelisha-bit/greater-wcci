import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url' && supabaseAnonKey !== 'your_supabase_anon_key');
}

// Create Supabase client with TypeScript support
// If keys are missing, we create a dummy client or handle it gracefully in the UI
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : (null as any); // Type cast to avoid breaking existing code while allowing null check

// Database schema types (you'll need to generate these based on your Supabase schema)
export type Tables = Database['public']['Tables']
export type Enums = Database['public']['Enums']

// Helper functions for common operations
export const supabaseHelpers = {
  // Get current user
  getCurrentUser: () => supabase.auth.getUser(),

  // Sign out
  signOut: () => supabase.auth.signOut(),

  // Check if user is authenticated
  isAuthenticated: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  },

  // Get user session
  getSession: () => supabase.auth.getSession(),

  // Subscribe to auth changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}
