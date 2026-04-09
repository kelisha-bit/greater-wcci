import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabaseClient', () => {
  const getUser = vi.fn()
  const maybeSingle = vi.fn()
  const from = vi.fn(() => {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
    }
  })

  return {
    supabase: {
      auth: {
        getUser,
      },
      from,
    },
  }
})

import { supabaseAuthApi } from './supabaseApi'
import { supabase } from './supabaseClient'

describe('supabaseAuthApi.getRoleFlags', () => {
  it('returns guest flags when no user is authenticated', async () => {
    ;(supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const flags = await supabaseAuthApi.getRoleFlags()

    expect(flags.role).toBe('guest')
    expect(flags.isAdmin).toBe(false)
    expect(flags.isStaff).toBe(false)
    expect(flags.isAdminOrStaff).toBe(false)
  })

  it('treats metadata admin as admin even without user_roles row', async () => {
    ;(supabase.auth.getUser as any).mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          app_metadata: { role: 'admin' },
          user_metadata: {},
        },
      },
      error: null,
    })

    ;(supabase.from('user_roles').maybeSingle as any).mockResolvedValue({
      data: null,
      error: null,
    })

    const flags = await supabaseAuthApi.getRoleFlags()

    expect(flags.role).toBe('admin')
    expect(flags.isAdmin).toBe(true)
    expect(flags.isStaff).toBe(false)
    expect(flags.isAdminOrStaff).toBe(true)
  })

  it('prefers user_roles admin over metadata member', async () => {
    ;(supabase.auth.getUser as any).mockResolvedValue({
      data: {
        user: {
          id: 'user-2',
          app_metadata: {},
          user_metadata: { role: 'member' },
        },
      },
      error: null,
    })

    ;(supabase.from('user_roles').maybeSingle as any).mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    })

    const flags = await supabaseAuthApi.getRoleFlags()

    expect(flags.role).toBe('admin')
    expect(flags.isAdmin).toBe(true)
    expect(flags.isStaff).toBe(false)
    expect(flags.isAdminOrStaff).toBe(true)
  })
})
