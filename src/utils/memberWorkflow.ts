import type { Member } from '../services/api';

interface MemberDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  departments: string[];
}

const normalizePhone = (value: string) => value.trim().replace(/\D/g, '');

export function findDuplicateMember(members: Member[] | null | undefined, draft: MemberDraft): Member | null {
  if (!members || members.length === 0) return null;
  const normalizedEmail = draft.email.trim().toLowerCase();
  const normalizedName = `${draft.firstName} ${draft.lastName}`.trim().toLowerCase();
  const normalizedPhone = normalizePhone(draft.phone);

  return (
    members.find((member) => {
      const emailMatches =
        normalizedEmail.length > 0 && member.email.trim().toLowerCase() === normalizedEmail;
      const nameMatches =
        normalizedName.length > 0 && member.name.trim().toLowerCase() === normalizedName;
      const phoneMatches =
        normalizedPhone.length > 0 && normalizePhone(member.phone) === normalizedPhone;
      return emailMatches || (nameMatches && phoneMatches);
    }) || null
  );
}

export function getWorkflowValidationErrors(draft: MemberDraft, duplicateMember: Member | null): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.email.trim()) {
    errors.email = 'Email is required';
  }
  if (!draft.phone.trim()) {
    errors.phone = 'Phone number is required';
  }
  if (!draft.role.trim()) {
    errors.role = 'Role is required';
  }
  if (draft.departments.length === 0) {
    errors.departments = 'Please select at least one department';
  }
  if (duplicateMember) {
    const emailDuplicate = duplicateMember.email.trim().toLowerCase() === draft.email.trim().toLowerCase();
    if (emailDuplicate) {
      errors.email = `A member with this email address already exists (${duplicateMember.name}).`;
    } else {
      errors.firstName = `Possible duplicate member found (${duplicateMember.name}). Please verify before submitting.`;
    }
  }

  return errors;
}
