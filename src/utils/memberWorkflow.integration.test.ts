import { describe, expect, it } from 'vitest';
import type { Member } from '../services/api';
import { findDuplicateMember, getWorkflowValidationErrors } from './memberWorkflow';

const existingMembers: Member[] = [
  {
    id: 'm-1',
    name: 'Existing Member',
    email: 'existing@church.org',
    phone: '(555) 111-2222',
    status: 'active',
    role: 'Member',
    primaryMinistry: 'Worship Team',
    joinDate: '2026-01-01',
    dateOfBirth: '1990-01-01',
    departments: ['Worship Team'],
  },
];

describe('member workflow integration', () => {
  it('flags duplicate email members in workflow', () => {
    const duplicate = findDuplicateMember(existingMembers, {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'existing@church.org',
      phone: '5559990000',
      role: 'Pastor',
      departments: ['Worship Team'],
    });

    const errors = getWorkflowValidationErrors(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'existing@church.org',
        phone: '5559990000',
        role: 'Pastor',
        departments: ['Worship Team'],
      },
      duplicate
    );

    expect(duplicate?.id).toBe('m-1');
    expect(errors.email).toContain('already exists');
  });

  it('accepts valid workflow data with no duplicates', () => {
    const duplicate = findDuplicateMember(existingMembers, {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@church.org',
      phone: '(555) 222-3333',
      role: 'Pastor',
      departments: ['Worship Team'],
    });

    const errors = getWorkflowValidationErrors(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@church.org',
        phone: '(555) 222-3333',
        role: 'Pastor',
        departments: ['Worship Team'],
      },
      duplicate
    );

    expect(duplicate).toBeNull();
    expect(errors).toEqual({});
  });

  it('enforces required workflow fields before confirmation', () => {
    const errors = getWorkflowValidationErrors(
      {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
        departments: [],
      },
      null
    );

    expect(errors.email).toBe('Email is required');
    expect(errors.phone).toBe('Phone number is required');
    expect(errors.role).toBe('Role is required');
    expect(errors.departments).toBe('Please select at least one department');
  });
});
