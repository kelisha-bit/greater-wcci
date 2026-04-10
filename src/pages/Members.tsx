import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Plus, Mail, Phone, MapPin, Calendar, 
  ChevronDown, Download, Upload, MoreHorizontal, User,
  Heart, Users, Edit, X, Camera, AlertCircle, CheckCircle2,
  FileText, Briefcase, Check, Cake, Building2, GraduationCap,
  Home, AlertTriangle, HandHeart,
  Trash2, LayoutGrid, LayoutList
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import EmptyState from '../components/EmptyState';
import { useMembers, useCreateMember, useMemberStats } from '../hooks/useData';
import { useAPI } from '../hooks/useAPI';
import { useNotification } from '../hooks/useNotification';
import type { Member, Donation, Attendance } from '../services/api';
import { 
  ministryColors, 
  memberStatusColors, 
  departmentColors 
} from '../constants/colors';
import { 
  roleOptions, 
  ministryOptions,
  baptismStatusOptions,
  maritalStatusOptions,
} from '../constants/options';
import { MemberCard, MemberCardSkeleton, MemberProfileModal } from '../components/members';
import { validateMemberForm } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

type ProfileTab = 'overview' | 'donations' | 'attendance' | 'family';

interface TabCache {
  [key: string]: Donation[] | Attendance[] | any[] | undefined;
  donations?: Donation[];
  attendance?: Attendance[];
  family?: any[];
}

interface EditMemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  joinDate: string;
  dateOfBirth: string;
  address: string;
  role: string;
  primaryMinistry: string;
  departments: string[];
  education: string;
  hometown: string;
  occupation: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  baptismStatus: string;
  maritalStatus: string;
  ministryInvolvement: string[];
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  role: string;
  ministry: string;
  departments: string[];
  status: string;
  joinDate: string;
  occupation: string;
  education: string;
  hometown: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContact: EmergencyContact;
  notes: string;
  baptismStatus: string;
  maritalStatus: string;
  ministryInvolvement: string[];
}


const educationOptions = [
  'Primary school',
  'Secondary school',
  'Tetiary',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctorate',
  'Trade School',
  'None',
];

const relationshipOptions = [
  'Spouse',
  'Parent',
  'Sibling',
  'Child',
  'Friend',
  'Other Relative',
  'Other',
];

const statusOptions = [
  { value: 'active', label: 'Active', description: 'Regular attending member' },
  { value: 'inactive', label: 'Inactive', description: 'Not currently active' },
  { value: 'new', label: 'New', description: 'Recently joined' },
];

const departmentOptions = [
  { id: 'worship', name: 'Worship Team', color: departmentColors['Worship Team'] },
  { id: 'children', name: "Children's Ministry", color: departmentColors["Children's Ministry"] },
  { id: 'youth', name: 'Youth Ministry', color: departmentColors['Youth Ministry'] },
  { id: 'bible', name: 'Bible Study', color: departmentColors['Bible Study'] },
  { id: 'kitchen', name: 'Community Kitchen', color: departmentColors['Community Kitchen'] },
  { id: 'outreach', name: 'Outreach', color: departmentColors['Outreach'] },
  { id: 'prayer', name: 'Prayer Team', color: departmentColors['Prayer Team'] },
  { id: 'admin', name: 'Administration', color: departmentColors['Administration'] },
  { id: 'new', name: 'New Members', color: departmentColors['New Members'] },
];

function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Members() {
  const { isAdminOrStaff } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMinistry, setSelectedMinistry] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<EditMemberForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'active',
    joinDate: '',
    dateOfBirth: '',
    address: '',
    role: 'Member',
    primaryMinistry: '',
    departments: [],
    education: '',
    hometown: '',
    occupation: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
    baptismStatus: '',
    maritalStatus: '',
    ministryInvolvement: [],
  });
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPickError, setEditPhotoPickError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPhotoUploadError, setEditPhotoUploadError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPickError, setPhotoPickError] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  
  // Auth state for management permissions
  const canManageMembers = isAdminOrStaff;
  const canManageMembersLoading = false;
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  
  // Modal tabs state
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [tabCache, setTabCache] = useState<TabCache>({});
  const [tabLoading, setTabLoading] = useState<Record<ProfileTab, boolean>>({
    overview: false,
    donations: false,
    attendance: false,
    family: false,
  });
  const [tabError, setTabError] = useState<Record<ProfileTab, string | null>>({
    overview: null,
    donations: null,
    attendance: null,
    family: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'joinDate' | 'status' | 'ministry'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkMinistry, setBulkMinistry] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  
  // Use data hooks
  const { api } = useAPI();
  const { data: members, isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useMembers(1, 1000);
  const {
    data: memberStats,
    isLoading: statsLoading,
    refetch: refetchMemberStats,
  } = useMemberStats();
  const { create: createMember } = useCreateMember();
  const { show: showToast } = useNotification();

  // Load tab data lazily per member
  const loadTabData = async (tab: ProfileTab, memberId: string) => {
    const cacheKey = `${memberId}-${tab}`;
    if (tabCache[cacheKey as keyof TabCache]) return;

    setTabLoading(prev => ({ ...prev, [tab]: true }));
    setTabError(prev => ({ ...prev, [tab]: null }));

    try {
      switch (tab) {
        case 'donations': {
          const response = await api.donations.getDonations({ donorId: memberId, pageSize: 50 });
          if (response.success && response.data) {
            setTabCache(prev => ({ ...prev, [cacheKey]: response.data }));
          } else {
            setTabError(prev => ({ ...prev, donations: response.error || 'Failed to load donations' }));
          }
          break;
        }
        case 'attendance': {
          const response = await api.attendance.getAttendanceRecords({ memberId });
          if (response.success && response.data) {
            setTabCache(prev => ({ ...prev, [cacheKey]: response.data }));
          } else {
            setTabError(prev => ({ ...prev, attendance: response.error || 'Failed to load attendance' }));
          }
          break;
        }
        case 'family': {
          // TODO: implement family API when ready
          setTabError(prev => ({ ...prev, family: 'Family data not available yet' }));
          break;
        }
      }
    } catch (err) {
      setTabError(prev => ({ ...prev, [tab]: err instanceof Error ? err.message : 'Failed to load data' }));
    } finally {
      setTabLoading(prev => ({ ...prev, [tab]: false }));
    }
  };

  // Reset tab cache when selected member changes
  useEffect(() => {
    if (selectedMember) {
      setActiveTab('overview');
      setTabCache({});
      setTabError({ overview: null, donations: null, attendance: null, family: null });
      setTabLoading({ overview: false, donations: false, attendance: false, family: false });
    }
  }, [selectedMember]);

  // Auto-load when switching tabs
  useEffect(() => {
    if (selectedMember && activeTab !== 'overview') {
      loadTabData(activeTab, selectedMember.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedMember]);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    role: '',
    ministry: '',
    departments: [],
    status: 'active',
    joinDate: new Date().toISOString().split('T')[0],
    occupation: '',
    education: '',
    hometown: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
    notes: '',
    baptismStatus: '',
    maritalStatus: '',
    ministryInvolvement: [],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: any) => {
    const result = validateMemberForm({ ...formData, [name]: value });
    if (!result.success && result.errors) {
      return result.errors[name];
    }
    return undefined;
  };

  const handleInputChange = (name: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setFormErrors(prev => ({ ...prev, [name]: error || '' }));
    }
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    const newEmergencyContact = { ...formData.emergencyContact, [field]: value };
    setFormData(prev => ({
      ...prev,
      emergencyContact: newEmergencyContact,
    }));
    
    if (touched[`emergencyContact.${field}`]) {
      const result = validateMemberForm({ ...formData, emergencyContact: newEmergencyContact });
      const error = result.success ? undefined : result.errors?.[`emergencyContact.${field}`];
      setFormErrors(prev => ({ ...prev, [`emergencyContact.${field}`]: error || '' }));
    }
  };

  const handleDepartmentToggle = (deptName: string) => {
    const newDepartments = formData.departments.includes(deptName)
      ? formData.departments.filter(d => d !== deptName)
      : [...formData.departments, deptName];
    
    handleInputChange('departments', newDepartments);
    setTouched(prev => ({ ...prev, departments: true }));
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const value = formData[name as keyof FormData];
    const error = validateField(name, value);
    setFormErrors(prev => ({ ...prev, [name]: error || '' }));
  };

  const validateForm = (): boolean => {
    const result = validateMemberForm(formData);
    if (!result.success && result.errors) {
      setFormErrors(result.errors);
      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      Object.keys(result.errors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(prev => ({ ...prev, ...allTouched }));
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setPhotoUploadError(null);
    
    // Prepare member data for API
    const memberData: Omit<Member, 'id'> = {
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      status: formData.status as 'active' | 'inactive' | 'new',
      role: formData.role,
      primaryMinistry: formData.ministry,
      joinDate: formData.joinDate,
      dateOfBirth: formData.dateOfBirth,
      departments: formData.departments,
      education: formData.education,
      hometown: formData.hometown,
      occupation: formData.occupation,
      emergencyContact: formData.emergencyContact,
      notes: formData.notes,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      baptismStatus: formData.baptismStatus,
      maritalStatus: formData.maritalStatus,
      ministryInvolvement: formData.ministryInvolvement,
    };
    
    const fileToUpload = photoFile;
    const result = await createMember(memberData);

    if (result?.id && fileToUpload) {
      const photoRes = await api.members.uploadAndSetProfilePhoto(result.id, fileToUpload);
      if (!photoRes.success) {
        setPhotoUploadError(photoRes.error || 'Could not upload profile photo.');
      }
    }
    
    setIsSubmitting(false);
    
    if (result) {
      showToast('success', 'Member Created', `${formData.firstName} ${formData.lastName} has been added.`);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowAddModal(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          role: '',
          ministry: '',
          departments: [],
          status: 'active',
          joinDate: new Date().toISOString().split('T')[0],
          occupation: '',
          education: '',
          hometown: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          emergencyContact: {
            name: '',
            phone: '',
            relationship: '',
          },
          notes: '',
          baptismStatus: '',
          maritalStatus: '',
          ministryInvolvement: [],
        });
        setPhotoPreview(null);
        setPhotoFile(null);
        setPhotoPickError(null);
        setPhotoUploadError(null);
        setTouched({});
        setFormErrors({});
        // Refetch members to show the new member
        void refetchMembers();
        void refetchMemberStats();
      }, 1500);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setPhotoPickError(null);
    setPhotoUploadError(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      role: '',
      ministry: '',
      departments: [],
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      occupation: '',
      education: '',
      hometown: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      notes: '',
      baptismStatus: '',
      maritalStatus: '',
      ministryInvolvement: [],
    });
    setPhotoPreview(null);
    setPhotoFile(null);
    setTouched({});
    setFormErrors({});
  };

  const handleCloseEditModal = () => {
    setEditingMember(null);
    setEditPhotoFile(null);
    setEditPhotoPickError(null);
    setEditError(null);
    setEditPhotoUploadError(null);
  };

  const openEditMember = (member: Member) => {
    const parts = member.name.trim().split(/\s+/);
    setEditForm({
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      email: member.email,
      phone: member.phone,
      status: member.status,
      joinDate: (member.joinDate && member.joinDate.slice(0, 10)) || '',
      dateOfBirth: (member.dateOfBirth && member.dateOfBirth.slice(0, 10)) || '',
      address: member.address || '',
      role: member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1).toLowerCase() : 'Member',
      primaryMinistry: member.primaryMinistry || '',
      departments: member.departments || [],
      education: member.education || '',
      hometown: member.hometown || '',
      occupation: member.occupation || '',
      city: member.city || '',
      state: member.state || '',
      zipCode: member.zipCode || '',
      notes: member.notes || '',
      baptismStatus: member.baptismStatus || '',
      maritalStatus: member.maritalStatus || '',
      ministryInvolvement: member.ministryInvolvement || [],
    });
    setEditPhotoPreview(member.profileImageUrl || null);
    setEditPhotoFile(null);
    setEditPhotoPickError(null);
    setEditError(null);
    setEditPhotoUploadError(null);
    setEditingMember(member);
  };

  const handleEditSubmit = async () => {
    if (!editingMember) return;
    
    const result = validateMemberForm({
      ...editForm,
    });

    if (!result.success) {
      setEditError(Object.values(result.errors || {}).join('. ') || 'Validation failed.');
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    setEditPhotoUploadError(null);

    const name = `${editForm.firstName.trim()} ${editForm.lastName.trim()}`.trim();

    const payload: Partial<Member> = {
      name,
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      status: editForm.status as Member['status'],
      joinDate: editForm.joinDate,
      dateOfBirth: editForm.dateOfBirth || undefined,
      address: editForm.address.trim(),
      role: editForm.role.toLowerCase(),
      primaryMinistry: editForm.primaryMinistry,
      departments: editForm.departments,
      education: editForm.education,
      hometown: editForm.hometown,
      occupation: editForm.occupation,
      notes: editForm.notes,
      city: editForm.city,
      state: editForm.state,
      zipCode: editForm.zipCode,
      baptismStatus: editForm.baptismStatus,
      maritalStatus: editForm.maritalStatus,
      ministryInvolvement: editForm.ministryInvolvement,
    };

    const res = await api.members.updateMember(editingMember.id, payload);
    if (!res.success) {
      setEditError(res.error || 'Could not save changes.');
      setEditSubmitting(false);
      return;
    }

    if (editPhotoFile) {
      const photoRes = await api.members.uploadAndSetProfilePhoto(
        editingMember.id,
        editPhotoFile
      );
      if (!photoRes.success) {
        setEditPhotoUploadError(photoRes.error || 'Could not upload photo.');
        setEditSubmitting(false);
        await refetchMembers();
        await refetchMemberStats();
        return;
      }
    }

    setEditSubmitting(false);
    showToast('success', 'Profile Updated', 'Member changes have been saved.');
    await refetchMembers();
    await refetchMemberStats();
    handleCloseEditModal();
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    setDeleteSubmitting(true);
    try {
      const result = await api.members.deleteMember(memberToDelete.id);
      if (result.success) {
        showToast('success', 'Member Deleted', `${memberToDelete.name} has been removed from the system.`);
        setDeleteConfirmOpen(false);
        setMemberToDelete(null);
        await refetchMembers();
        await refetchMemberStats();
      } else {
        showToast('error', 'Delete Failed', result.error || 'Failed to delete member');
      }
    } catch {
      showToast('error', 'Delete Failed', 'An unexpected error occurred while deleting the member');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openDeleteConfirm = (member: Member) => {
    setMemberToDelete(member);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setMemberToDelete(null);
  };

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    
    return members.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || member.status === selectedStatus;
      const matchesMinistry = selectedMinistry === 'all' || member.primaryMinistry === selectedMinistry;
      return matchesSearch && matchesStatus && matchesMinistry;
    });
  }, [members, searchQuery, selectedStatus, selectedMinistry]);

  const sortedMembers = useMemo(() => {
    const arr = [...filteredMembers];
    const cmp = (a: Member, b: Member) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (sortBy === 'name') {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else if (sortBy === 'joinDate') {
        va = new Date(a.joinDate).getTime();
        vb = new Date(b.joinDate).getTime();
      } else if (sortBy === 'status') {
        va = a.status;
        vb = b.status;
      } else {
        va = (a.primaryMinistry || '').toLowerCase();
        vb = (b.primaryMinistry || '').toLowerCase();
      }
      const r = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? r : -r;
    };
    arr.sort(cmp);
    return arr;
  }, [filteredMembers, sortBy, sortDir]);

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedMembers, currentPage]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedMembers.length / ITEMS_PER_PAGE));
  }, [sortedMembers]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, selectedStatus, selectedMinistry]);

  const exportMembersToCSV = useCallback(() => {
    const source = selectedIds.size > 0
      ? sortedMembers.filter(m => selectedIds.has(m.id))
      : sortedMembers;
    const header = [
      'Name','Email','Phone','Status','Role','Primary Ministry',
      'Join Date','Date of Birth','Address','Departments'
    ];
    const rows = source.map(m => [
      m.name,
      m.email,
      m.phone,
      m.status,
      m.role,
      m.primaryMinistry,
      m.joinDate,
      m.dateOfBirth || '',
      m.address || '',
      (m.departments || []).join('|')
    ]);
    const csv = [header.join(','), ...rows.map(r => r.map(v => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `members_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sortedMembers, selectedIds]);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const items: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let j = 0; j < lines[i].length; j++) {
        const ch = lines[i][j];
        if (inQuotes) {
          if (ch === '"' && lines[i][j + 1] === '"') {
            cur += '"';
            j++;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            cur += ch;
          }
        } else {
          if (ch === '"') {
            inQuotes = true;
          } else if (ch === ',') {
            cols.push(cur);
            cur = '';
          } else {
            cur += ch;
          }
        }
      }
      cols.push(cur);
      const rec: Record<string, string> = {};
      header.forEach((h, idx) => {
        rec[h] = (cols[idx] ?? '').trim();
      });
      items.push(rec);
    }
    return items;
  };

  const handleImportFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      let created = 0;
      for (const r of rows) {
        const name = r['name'] || '';
        const email = r['email'] || '';
        const phone = r['phone'] || '';
        if (!name || !email) continue;
        const status = (r['status'] || 'active').toLowerCase() as Member['status'];
        const role = r['role'] || 'Member';
        const primaryMinistry = r['primary ministry'] || r['primary_ministry'] || '';
        const joinDate = r['join date'] || r['join_date'] || new Date().toISOString().slice(0, 10);
        const dateOfBirth = r['date of birth'] || r['date_of_birth'] || '';
        const address = r['address'] || '';
        const departmentsStr = r['departments'] || '';
        const departments = departmentsStr ? departmentsStr.split('|').map(s => s.trim()).filter(Boolean) : [];
        const payload: Omit<Member, 'id'> = {
          name,
          email,
          phone,
          status,
          role,
          primaryMinistry,
          joinDate,
          dateOfBirth,
          departments,
          education: '',
          hometown: '',
          emergencyContact: { name: '', phone: '', relationship: '' },
          notes: '',
          address,
        };
        const res = await createMember(payload);
        if (res?.id) created++;
      }
      showToast('success', 'Import Complete', `${created} members imported`);
      await refetchMembers();
      await refetchMemberStats();
    } catch {
      showToast('error', 'Import Failed', 'Could not import members from CSV');
    } finally {
      setImporting(false);
    }
  }, [createMember, showToast, refetchMembers, refetchMemberStats]);

  const applyBulkStatus = useCallback(async (status: Member['status']) => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await api.members.updateMember(id, { status });
      }
      showToast('success', 'Status Updated', 'Selected members updated');
      setSelectedIds(new Set());
      await refetchMembers();
      await refetchMemberStats();
    } catch {
      showToast('error', 'Update Failed', 'Could not update selected members');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [selectedIds, api, showToast, refetchMembers, refetchMemberStats]);

  const applyBulkMinistry = useCallback(async () => {
    if (!bulkMinistry || selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await api.members.updateMember(id, { primaryMinistry: bulkMinistry });
      }
      showToast('success', 'Ministry Assigned', 'Selected members updated');
      setSelectedIds(new Set());
      setBulkMinistry('');
      await refetchMembers();
      await refetchMemberStats();
    } catch {
      showToast('error', 'Update Failed', 'Could not assign ministry');
    } finally {
      setIsBulkUpdating(false);
    }
  }, [bulkMinistry, selectedIds, api, showToast, refetchMembers, refetchMemberStats]);

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await api.members.deleteMember(id);
      }
      showToast('success', 'Members Deleted', 'Selected members removed');
      setSelectedIds(new Set());
      await refetchMembers();
      await refetchMemberStats();
    } catch {
      showToast('error', 'Delete Failed', 'Could not delete selected members');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, api, showToast, refetchMembers, refetchMemberStats]);
  return (
    <>
      <Header />
      <ErrorBoundary>
      <main className="p-6 lg:p-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-stone-800">Members</h1>
              <p className="text-stone-600 mt-1">Manage your church community</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canManageMembers && !canManageMembersLoading && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importing...' : 'Import'}
                </button>
              )}
              {canManageMembers && !canManageMembersLoading && (
                <button
                  onClick={exportMembersToCSV}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
              {canManageMembers && !canManageMembersLoading && (
                <button 
                  onClick={() => {
                    setPhotoPickError(null);
                    setPhotoUploadError(null);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Member
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Row — live counts from Supabase */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-stone-200/80 rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-stone-800 tabular-nums">
                    {(memberStats?.totalMembers ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-stone-500">Total members</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-stone-200/80 rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-stone-800 tabular-nums">
                    {(memberStats?.activeMembers ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-stone-500">Active</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                {statsLoading ? (
                  <div className="h-8 w-16 bg-stone-200/80 rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-stone-800 tabular-nums">
                    {(memberStats?.newThisMonth ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-stone-500">New this month</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shrink-0">
                <HandHeart className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                {statsLoading ? (
                  <div className="h-8 w-14 bg-stone-200/80 rounded animate-pulse mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-stone-800 tabular-nums">
                    {(memberStats?.visitorCount ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-stone-500">Visitors</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search members by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="new">New</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={selectedMinistry}
                  onChange={(e) => setSelectedMinistry(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                >
                  <option value="all">All Ministries</option>
                  {Array.from(ministryOptions).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                >
                  <option value="name">Sort: Name</option>
                  <option value="joinDate">Sort: Joined</option>
                  <option value="status">Sort: Status</option>
                  <option value="ministry">Sort: Ministry</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
              <button
                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-colors"
              >
                <ChevronDown className={`w-5 h-5 text-stone-600 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
              </button>
              <button className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-colors">
                <Filter className="w-5 h-5 text-stone-600" />
              </button>
              <div className="flex items-center bg-stone-50 rounded-xl border border-stone-200 p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400 hover:text-stone-600'}`}
                  title="Card view"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-400 hover:text-stone-600'}`}
                  title="Table view"
                >
                  <LayoutList className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          {canManageMembers && selectedIds.size > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-stone-600">{selectedIds.size} selected</span>
              <button
                onClick={() => applyBulkStatus('active')}
                disabled={isBulkUpdating}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                Set Active
              </button>
              <button
                onClick={() => applyBulkStatus('inactive')}
                disabled={isBulkUpdating}
                className="px-3 py-1.5 rounded-lg bg-stone-50 text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                Set Inactive
              </button>
              <div className="relative">
                <select
                  value={bulkMinistry}
                  onChange={(e) => setBulkMinistry(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                >
                  <option value="">Assign Ministry…</option>
                  {Array.from(ministryOptions).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
              <button
                onClick={applyBulkMinistry}
                disabled={isBulkUpdating || !bulkMinistry}
                className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                Apply
              </button>
              <button
                onClick={deleteSelected}
                disabled={isBulkDeleting}
                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                Delete Selected
              </button>
            </div>
          )}
        </motion.div>

        {/* Members List - Card or Table View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={viewMode === 'table' ? "bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 overflow-hidden" : ""}
        >
          {membersLoading ? (
            viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <MemberCardSkeleton key={i} index={i} />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
                <p className="text-stone-600">Loading members...</p>
              </div>
            )
          ) : membersError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className="text-stone-600 mb-4">Failed to load members: {membersError}</p>
              <button 
                type="button"
                onClick={() => {
                  void refetchMembers();
                  void refetchMemberStats();
                }}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : sortedMembers.length === 0 ? (
            <div className={viewMode === 'table' ? "" : "bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-8"}>
              <EmptyState
                icon="search"
                title="No members found"
                description="No members match your current search or filter criteria."
                action={{
                  label: "Clear Filters",
                  onClick: () => {
                    setSearchQuery('');
                    setSelectedStatus('all');
                    setSelectedMinistry('all');
                  }
                }}
              />
            </div>
          ) : viewMode === 'cards' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedMembers.map((member, index) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    index={index}
                    selected={selectedIds.has(member.id)}
                    canManage={canManageMembers}
                    onSelect={(id, selected) => {
                      const next = new Set(selectedIds);
                      if (selected) next.add(id);
                      else next.delete(id);
                      setSelectedIds(next);
                    }}
                    onClick={() => setSelectedMember(member)}
                    onEdit={() => {
                      setSelectedMember(null);
                      openEditMember(member);
                    }}
                    onDelete={() => openDeleteConfirm(member)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 px-5 py-4">
                  <p className="text-sm text-stone-500">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedMembers.length)} of {sortedMembers.length} members
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg bg-stone-50 text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-stone-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg bg-stone-50 text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left py-4 px-6">
                    <input
                      type="checkbox"
                      checked={
                        paginatedMembers.length > 0 &&
                        paginatedMembers.every(m => selectedIds.has(m.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) {
                          paginatedMembers.forEach(m => next.add(m.id));
                        } else {
                          paginatedMembers.forEach(m => next.delete(m.id));
                        }
                        setSelectedIds(next);
                      }}
                    />
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Member</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Ministry</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Joined</th>
                  <th className="text-right py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((member, index) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-stone-50 hover:bg-amber-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedMember(member)}
                  >
                    <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(member.id);
                          else next.delete(member.id);
                          setSelectedIds(next);
                        }}
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg shrink-0 overflow-hidden flex items-center justify-center ${
                            member.profileImageUrl
                              ? 'bg-stone-200'
                              : `bg-gradient-to-br ${ministryColors[member.primaryMinistry as keyof typeof ministryColors] || 'from-stone-400 to-gray-500'}`
                          }`}
                        >
                          {member.profileImageUrl ? (
                            <img
                              src={member.profileImageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  const span = document.createElement('span');
                                  span.className = 'text-white font-medium text-sm';
                                  span.innerText = memberInitials(member.name);
                                  parent.appendChild(span);
                                  parent.classList.remove('bg-stone-200');
                                  parent.classList.add(`bg-gradient-to-br`);
                                  const gradient = ministryColors[member.primaryMinistry as keyof typeof ministryColors] || 'from-stone-400 to-gray-500';
                                  gradient.split(' ').forEach((cls: string) => parent.classList.add(cls));
                                }
                              }}
                            />
                          ) : (
                            <span className="text-white font-medium text-sm">
                              {memberInitials(member.name)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-stone-800">{member.name}</p>
                          <p className="text-xs text-stone-500">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          {member.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          {member.phone}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-stone-700">{member.primaryMinistry}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${memberStatusColors[member.status as keyof typeof memberStatusColors]}`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-stone-600">{new Date(member.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {canManageMembers && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMember(null);
                              openEditMember(member);
                            }}
                            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                            aria-label={`Edit ${member.name}`}
                          >
                            <Edit className="w-4 h-4 text-stone-500" />
                          </button>
                        )}
                        {canManageMembers && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirm(member);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                            aria-label={`Delete ${member.name}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="w-4 h-4 text-stone-500" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-between">
                <p className="text-sm text-stone-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedMembers.length)} of {sortedMembers.length} members
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg bg-stone-50 text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-stone-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg bg-stone-50 text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </motion.div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleImportFileChange}
          className="hidden"
        />

        {/* Member Profile Modal */}
        {selectedMember && (
          <MemberProfileModal
            member={selectedMember}
            activeTab={activeTab}
            tabCache={tabCache}
            tabLoading={tabLoading}
            tabError={tabError}
            canManage={canManageMembers}
            onClose={() => setSelectedMember(null)}
            onEdit={(m) => { setSelectedMember(null); openEditMember(m); }}
            onDelete={(m) => { setSelectedMember(null); openDeleteConfirm(m); }}
            onTabChange={setActiveTab}
          />
        )}

        {/* Edit Member Modal */}
        <AnimatePresence>
          {editingMember && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={handleCloseEditModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8 overflow-hidden relative"
              >
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-white">Edit member</h2>
                      <p className="text-amber-100 text-sm mt-1">Update details and profile photo</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseEditModal}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                <div className="p-6 max-h-[calc(100vh-160px)] overflow-y-auto space-y-6">
                  {editError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      {editError}
                    </div>
                  )}
                  {editPhotoUploadError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      {editPhotoUploadError}
                    </div>
                  )}

                  <div className="flex items-center gap-6 pb-6 border-b border-stone-100">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center overflow-hidden border-2 border-dashed border-stone-300 group-hover:border-amber-400 transition-colors">
                        {editPhotoPreview ? (
                          <img src={editPhotoPreview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-stone-400" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const input = e.target;
                            const file = input.files?.[0];
                            input.value = '';
                            setEditPhotoPickError(null);
                            if (!file) return;
                            if (!file.type.startsWith('image/')) {
                              setEditPhotoPickError('Please choose an image file.');
                              return;
                            }
                            if (file.size > MAX_PROFILE_PHOTO_BYTES) {
                              setEditPhotoPickError('Image must be 5MB or smaller.');
                              return;
                            }
                            setEditPhotoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () =>
                              setEditPhotoPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="font-medium text-stone-800">Profile photo</h3>
                      <p className="text-sm text-stone-500 mt-1">Choose a new image to replace the current one</p>
                      <p className="text-xs text-stone-400 mt-2">JPG, PNG, GIF or WebP. Max 5MB</p>
                      {editPhotoPickError && (
                        <p className="text-xs text-rose-600 mt-2">{editPhotoPickError}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">First name</label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, firstName: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Last name</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, lastName: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, email: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, phone: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, status: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="new">New</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Join date</label>
                      <input
                        type="date"
                        value={editForm.joinDate}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, joinDate: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Date of birth</label>
                      <input
                        type="date"
                        value={editForm.dateOfBirth}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Address</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, address: e.target.value }))
                        }
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        placeholder="Street, city, or full address"
                      />
                    </div>

                    {/* Role & Ministry (Full Access for Admin/Staff) */}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Church Role</label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      >
                        {['Admin','Staff','Member','Guest'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Primary Ministry</label>
                      <select
                        value={editForm.primaryMinistry}
                        onChange={(e) => setEditForm(f => ({ ...f, primaryMinistry: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      >
                        <option value="">None</option>
                        {ministryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Occupation</label>
                      <input
                        type="text"
                        value={editForm.occupation}
                        onChange={(e) => setEditForm(f => ({ ...f, occupation: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        placeholder="e.g. Teacher, Engineer"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Administrative Notes</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        placeholder="Internal notes about this member..."
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEditSubmit}
                    disabled={editSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {editSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Save changes
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Member Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={handleCloseModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-white">Add New Member</h2>
                      <p className="text-amber-100 text-sm mt-1">Fill in the details to add a new member to the directory</p>
                    </div>
                    <button
                      onClick={handleCloseModal}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Success Overlay */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="text-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-stone-800">Member Added!</h3>
                        <p className="text-stone-500 mt-1">Successfully added to the directory</p>
                        {photoUploadError && (
                          <p className="text-sm text-amber-700 mt-3 max-w-xs mx-auto leading-snug">
                            Photo was not saved: {photoUploadError}
                          </p>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Form Content */}
                <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* Photo Upload Section */}
                  <div className="flex items-center gap-6 mb-8 pb-6 border-b border-stone-100">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center overflow-hidden border-2 border-dashed border-stone-300 group-hover:border-amber-400 transition-colors">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-stone-400" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const input = e.target;
                            const file = input.files?.[0];
                            input.value = '';
                            setPhotoPickError(null);
                            if (!file) return;
                            if (!file.type.startsWith('image/')) {
                              setPhotoPickError('Please choose an image file.');
                              return;
                            }
                            if (file.size > MAX_PROFILE_PHOTO_BYTES) {
                              setPhotoPickError('Image must be 5MB or smaller.');
                              return;
                            }
                            setPhotoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setPhotoPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="font-medium text-stone-800">Profile Photo</h3>
                      <p className="text-sm text-stone-500 mt-1">Upload a photo for easy identification</p>
                      <p className="text-xs text-stone-400 mt-2">JPG, PNG, GIF or WebP. Max 5MB</p>
                      {photoPickError && (
                        <p className="text-xs text-rose-600 mt-2">{photoPickError}</p>
                      )}
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-500" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* First Name */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          First Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            onBlur={() => handleBlur('firstName')}
                            className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                              formErrors.firstName && touched.firstName
                                ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                : 'border-stone-200 focus:ring-amber-500/20 focus:border-amber-500'
                            }`}
                            placeholder="Enter first name"
                          />
                          {touched.firstName && (
                            formErrors.firstName ? (
                              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                            ) : formData.firstName && (
                              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                            )
                          )}
                        </div>
                        {formErrors.firstName && touched.firstName && (
                          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.firstName}
                          </p>
                        )}
                      </div>

                      {/* Last Name */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Last Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            onBlur={() => handleBlur('lastName')}
                            className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                              formErrors.lastName && touched.lastName
                                ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                : 'border-stone-200 focus:ring-amber-500/20 focus:border-amber-500'
                            }`}
                            placeholder="Enter last name"
                          />
                          {touched.lastName && (
                            formErrors.lastName ? (
                              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                            ) : formData.lastName && (
                              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                            )
                          )}
                        </div>
                        {formErrors.lastName && touched.lastName && (
                          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.lastName}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            onBlur={() => handleBlur('email')}
                            className={`w-full pl-10 pr-4 py-2.5 bg-stone-50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                              formErrors.email && touched.email
                                ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                : 'border-stone-200 focus:ring-amber-500/20 focus:border-amber-500'
                            }`}
                            placeholder="email@example.com"
                          />
                          {touched.email && (
                            formErrors.email ? (
                              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                            ) : formData.email && (
                              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                            )
                          )}
                        </div>
                        {formErrors.email && touched.email && (
                          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.email}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            onBlur={() => handleBlur('phone')}
                            className={`w-full pl-10 pr-4 py-2.5 bg-stone-50 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                              formErrors.phone && touched.phone
                                ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                : 'border-stone-200 focus:ring-amber-500/20 focus:border-amber-500'
                            }`}
                            placeholder="(555) 123-4567"
                          />
                          {touched.phone && (
                            formErrors.phone ? (
                              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                            ) : formData.phone && (
                              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                            )
                          )}
                        </div>
                        {formErrors.phone && touched.phone && (
                          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.phone}
                          </p>
                        )}
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Date of Birth
                        </label>
                        <div className="relative">
                          <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Hometown */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Hometown
                        </label>
                        <div className="relative">
                          <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="text"
                            value={formData.hometown}
                            onChange={(e) => handleInputChange('hometown', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="City, State"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Background Information */}
                  <div className="mb-8 pt-6 border-t border-stone-100">
                    <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-amber-500" />
                      Background Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Occupation */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Occupation
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="text"
                            value={formData.occupation}
                            onChange={(e) => handleInputChange('occupation', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="e.g., Software Engineer"
                          />
                        </div>
                      </div>

                      {/* Education */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Education
                        </label>
                        <div className="relative">
                          <select
                            value={formData.education}
                            onChange={(e) => handleInputChange('education', e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          >
                            <option value="">Select education level...</option>
                            {educationOptions.map(edu => (
                              <option key={edu} value={edu}>{edu}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Marital Status */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Marital Status
                        </label>
                        <div className="relative">
                          <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <select
                            value={formData.maritalStatus}
                            onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          >
                            <option value="">Select marital status...</option>
                            {maritalStatusOptions.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Baptism Status */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Baptism Status
                        </label>
                        <div className="flex gap-2">
                          {baptismStatusOptions.map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleInputChange('baptismStatus', option)}
                              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                formData.baptismStatus === option
                                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role & Ministry */}
                  <div className="mb-8 pt-6 border-t border-stone-100">
                    <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-amber-500" />
                      Role & Ministry
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Role */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Role <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={formData.role}
                            onChange={(e) => handleInputChange('role', e.target.value)}
                            onBlur={() => handleBlur('role')}
                            className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm appearance-none transition-all focus:outline-none focus:ring-2 ${
                              formErrors.role && touched.role
                                ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                : 'border-stone-200 focus:ring-amber-500/20 focus:border-amber-500'
                            }`}
                          >
                            <option value="">Select a role...</option>
                            {roleOptions.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        </div>
                        {formErrors.role && touched.role && (
                          <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {formErrors.role}
                          </p>
                        )}
                      </div>

                      {/* Primary Ministry */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Primary Ministry
                        </label>
                        <div className="relative">
                          <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <select
                            value={formData.ministry}
                            onChange={(e) => handleInputChange('ministry', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          >
                            <option value="">Select primary ministry...</option>
                            {ministryOptions.map(ministry => (
                              <option key={ministry} value={ministry}>{ministry}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Status
                        </label>
                        <div className="flex gap-2">
                          {statusOptions.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleInputChange('status', option.value)}
                              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                                formData.status === option.value
                                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Join Date */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Join Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="date"
                            value={formData.joinDate}
                            onChange={(e) => handleInputChange('joinDate', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Multi-Select Departments */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">
                        Departments <span className="text-rose-500">*</span>
                        <span className="text-xs text-stone-400 font-normal ml-2">(Select all that apply)</span>
                      </label>
                      
                      {/* Selected Departments Display */}
                      {formData.departments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {formData.departments.map(dept => {
                            const deptInfo = departmentOptions.find(d => d.name === dept);
                            return (
                              <motion.span
                                key={dept}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${deptInfo?.color || 'bg-stone-100 text-stone-700 border-stone-200'}`}
                              >
                                {dept}
                                <button
                                  type="button"
                                  onClick={() => handleDepartmentToggle(dept)}
                                  className="hover:bg-white/50 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </motion.span>
                            );
                          })}
                        </div>
                      )}

                      {/* Department Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setDepartmentDropdownOpen(!departmentDropdownOpen)}
                          className={`w-full px-4 py-2.5 bg-stone-50 border rounded-xl text-sm text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 ${
                            formErrors.departments && touched.departments
                              ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                              : 'border-stone-200 focus:ring-amber-500/20 focus:border-amber-500'
                          }`}
                        >
                          <span className={formData.departments.length === 0 ? 'text-stone-400' : 'text-stone-700'}>
                            {formData.departments.length === 0 
                              ? 'Select departments...' 
                              : `${formData.departments.length} department${formData.departments.length > 1 ? 's' : ''} selected`}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${departmentDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {departmentDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-20 w-full mt-2 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden"
                            >
                              <div className="max-h-64 overflow-y-auto p-2">
                                {departmentOptions.map(dept => (
                                  <button
                                    key={dept.id}
                                    type="button"
                                    onClick={() => handleDepartmentToggle(dept.name)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                      formData.departments.includes(dept.name)
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'hover:bg-stone-50 text-stone-700'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                      formData.departments.includes(dept.name)
                                        ? 'bg-amber-500 border-amber-500'
                                        : 'border-stone-300'
                                    }`}>
                                      {formData.departments.includes(dept.name) && (
                                        <Check className="w-3.5 h-3.5 text-white" />
                                      )}
                                    </div>
                                    <span className="font-medium">{dept.name}</span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {formErrors.departments && touched.departments && (
                        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.departments}
                        </p>
                      )}
                    </div>

                    {/* Ministry Involvement */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">
                        Ministry Involvement
                        <span className="text-xs text-stone-400 font-normal ml-2">(Select all that apply)</span>
                      </label>

                      {/* Selected ministries */}
                      {formData.ministryInvolvement.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {formData.ministryInvolvement.map(m => (
                            <motion.span
                              key={m}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border bg-amber-50 text-amber-700 border-amber-200"
                            >
                              {m}
                              <button
                                type="button"
                                onClick={() => handleInputChange('ministryInvolvement', formData.ministryInvolvement.filter(x => x !== m))}
                                className="hover:bg-white/50 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ministryOptions.map(ministry => {
                          const selected = formData.ministryInvolvement.includes(ministry);
                          return (
                            <button
                              key={ministry}
                              type="button"
                              onClick={() => {
                                const next = selected
                                  ? formData.ministryInvolvement.filter(x => x !== ministry)
                                  : [...formData.ministryInvolvement, ministry];
                                handleInputChange('ministryInvolvement', next);
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                                selected
                                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                selected ? 'bg-amber-500 border-amber-500' : 'border-stone-300'
                              }`}>
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="truncate">{ministry}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="mb-8 pt-6 border-t border-stone-100">
                    <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      Address
                    </h3>
                    <div className="space-y-4">
                      {/* Street Address */}
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Street Address
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          placeholder="123 Main Street"
                        />
                      </div>

                      {/* City, State, Zip */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1.5">
                            City
                          </label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1.5">
                            State
                          </label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="State"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1.5">
                            ZIP Code
                          </label>
                          <input
                            type="text"
                            value={formData.zipCode}
                            onChange={(e) => handleInputChange('zipCode', e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="12345"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="mb-8 pt-6 border-t border-stone-100">
                    <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Emergency Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Contact Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="text"
                            value={formData.emergencyContact.name}
                            onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="Full name"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="tel"
                            value={formData.emergencyContact.phone}
                            onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1.5">
                          Relationship
                        </label>
                        <div className="relative">
                          <select
                            value={formData.emergencyContact.relationship}
                            onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          >
                            <option value="">Select relationship...</option>
                            {relationshipOptions.map(rel => (
                              <option key={rel} value={rel}>{rel}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="pt-6 border-t border-stone-100">
                    <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      Additional Notes
                    </h3>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                      placeholder="Any additional information about this member..."
                    />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                  <p className="text-xs text-stone-500">
                    <span className="text-rose-500">*</span> Required fields
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCloseModal}
                      className="px-6 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Save Member
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmOpen && memberToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={closeDeleteConfirm}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-stone-800">Delete Member</h3>
                      <p className="text-sm text-stone-600">This action cannot be undone</p>
                    </div>
                  </div>
                  
                  <div className="mb-6 p-4 bg-stone-50 rounded-lg">
                    <p className="text-sm text-stone-700 mb-2">
                      Are you sure you want to delete <span className="font-semibold">{memberToDelete.name}</span>?
                    </p>
                    <p className="text-xs text-stone-500">
                      This will permanently remove the member and all associated data from the system.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 justify-end">
                    <button
                      onClick={closeDeleteConfirm}
                      disabled={deleteSubmitting}
                      className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteMember}
                      disabled={deleteSubmitting}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deleteSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete Member
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </ErrorBoundary>
    </>
  );
}
