import { describe, expect, it } from 'vitest';
import { validateMemberForm } from './validation';

describe('validateMemberForm', () => {
  it('returns specific errors for invalid member data', () => {
    const result = validateMemberForm({
      firstName: 'J',
      lastName: '',
      email: 'bad-email',
      phone: '123',
      role: '',
      status: 'active',
      joinDate: '2026-13-01',
      dateOfBirth: '2026-00-11',
      primaryMinistry: '',
    });

    expect(result.success).toBe(false);
    expect(result.errors?.firstName).toBeDefined();
    expect(result.errors?.lastName).toBeDefined();
    expect(result.errors?.email).toBe('Invalid email address');
    expect(result.errors?.phone).toBe('Invalid phone number format');
    expect(result.errors?.role).toBe('Role is required');
  });

  it('passes with valid member form payload', () => {
    const result = validateMemberForm({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@church.org',
      phone: '(555) 123-4567',
      role: 'Pastor',
      status: 'active',
      joinDate: '2026-02-15',
      dateOfBirth: '1992-04-10',
      primaryMinistry: 'Worship Team',
      emergencyContact: {
        name: 'John Doe',
        phone: '5551234567',
        relationship: 'Spouse',
      },
    });

    expect(result.success).toBe(true);
  });
});
