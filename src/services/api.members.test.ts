import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseApi', () => {
  return {
    supabaseApi: {
      members: {
        createMember: vi.fn(async (payload: unknown) => {
          const rec = payload as Record<string, unknown>;
          return {
            id: '00000000-0000-0000-0000-000000000000',
            first_name: rec.first_name ?? '',
            last_name: rec.last_name ?? '',
            email: rec.email ?? '',
            phone: rec.phone ?? null,
            membership_status: rec.membership_status ?? 'visitor',
            join_date: rec.join_date ?? '2026-01-01',
            date_of_birth: rec.date_of_birth ?? null,
            profile_image_url: null,
            address: rec.address ?? null,
          };
        }),
      },
    },
  };
});

import { membersApi } from './api';

describe('membersApi.createMember', () => {
  it('passes address through to Supabase insert when provided', async () => {
    const res = await membersApi.createMember({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '123',
      status: 'active',
      role: 'member',
      primaryMinistry: '',
      joinDate: '2026-01-01',
      dateOfBirth: '',
      departments: [],
      address: '123 Main St',
      profileImageUrl: undefined,
    });

    expect(res.success).toBe(true);
    expect(res.data?.address).toBe('123 Main St');
  });
});

