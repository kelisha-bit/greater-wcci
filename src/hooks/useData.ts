/**
 * Custom Data Hooks
 * Encapsulates API calls with loading and error state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Member,
  MemberCreateInput,
  Event,
  Attendance,
  Donation,
  Sermon,
  Announcement,
  Report,
} from '../services/api';
import { useAPI } from './useAPI';

import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UseDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseListState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  refetch?: () => Promise<void>;
}

/**
 * Stable serialization of a filters object for use as a useEffect dependency.
 * Avoids re-fetching when a new object reference is passed with the same values.
 */
function useStableFilters(filters: Record<string, unknown> | undefined): string {
  const ref = useRef<string>('');
  const serialized = JSON.stringify(filters ?? {});
  if (ref.current !== serialized) {
    ref.current = serialized;
  }
  return ref.current;
}

// ============================================================================
// MEMBERS HOOKS
// ============================================================================

/**
 * Fetch all members with pagination
 */
export function useMembers(
  page: number = 1,
  pageSize: number = 10,
  status?: string
): UseListState<Member> & { refetch: () => Promise<void> } {
  const { api } = useAPI();
  const [state, setState] = useState<Omit<UseListState<Member>, 'refetch'>>({
    data: [],
    isLoading: true,
    error: null,
    total: 0,
    page,
    pageSize,
  });

  const loadMembers = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await api.members.getMembers(page, pageSize, status);
      if (response.success && response.data) {
        setState({
          data: response.data,
          isLoading: false,
          error: null,
          total: response.total || 0,
          page: response.page || page,
          pageSize: response.pageSize || pageSize,
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Failed to load members',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return {
    ...state,
    refetch: loadMembers,
  };
}

/**
 * Fetch all visitors with pagination
 */
export function useVisitors(
  page: number = 1,
  pageSize: number = 10
): UseListState<Member> & { refetch: () => Promise<void> } {
  return useMembers(page, pageSize, 'visitor');
}

/**
 * Fetch single member by ID
 */
export function useMember(id: string | null) {
  const { api } = useAPI();
  const [state, setState] = useState<UseDataState<Member>>({
    data: null,
    isLoading: Boolean(id),
    error: null,
  });

  useEffect(() => {
    if (!id) return;

    const loadMember = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.members.getMember(id);
        if (response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load member',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadMember();
  }, [id]);

  return state;
}

/**
 * Fetch current user's profile
 * Now uses AuthContext for shared state to avoid redundant requests
 */
export function useCurrentUserProfile() {
  const { profile, profileLoading } = useAuth();
  
  return {
    data: profile,
    isLoading: profileLoading,
    error: null,
  };
}

/**
 * Get member statistics
 */
export function useMemberStats() {
  const { api } = useAPI();
  const [state, setState] = useState<UseDataState<{
    totalMembers: number;
    activeMembers: number;
    newThisMonth: number;
    newMembersLastMonth: number;
    averageAge: number;
    visitorCount: number;
    ministryParticipants: number;
  }>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const loadStats = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await api.members.getMemberStats();
      if (response.success && response.data) {
        setState({
          data: response.data,
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Failed to load member stats',
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { ...state, refetch: loadStats };
}

// ============================================================================
// EVENTS HOOKS
// ============================================================================

/**
 * Fetch all events
 */
export function useEvents(filters?: Record<string, unknown>) {
  const { api } = useAPI();
  const [state, setState] = useState<UseListState<Event>>({
    data: [],
    isLoading: true,
    error: null,
    total: 0,
    page: 1,
    pageSize: 10,
  });

  const stableFilters = useStableFilters(filters);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.events.getEvents(filters);
        if (response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
            total: response.data.length,
            page: 1,
            pageSize: response.data.length,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load events',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableFilters]);

  return state;
}

/**
 * Fetch single event by ID
 */
export function useEvent(id: number | null) {
  const { api } = useAPI();
  const [state, setState] = useState<UseDataState<Event>>({
    data: null,
    isLoading: !id,
    error: null,
  });

  useEffect(() => {
    if (!id) return;

    const loadEvent = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.events.getEvent(id);
        if (response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load event',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadEvent();
  }, [id]);

  return state;
}

// ============================================================================
// ATTENDANCE HOOKS
// ============================================================================

/**
 * Fetch attendance records. When `enabled` is false, skips the request (empty data).
 */
export function useAttendance(
  filters?: Record<string, unknown>,
  enabled: boolean = true
): UseListState<Attendance> & { refetch: () => Promise<void> } {
  const { api } = useAPI();
  const [state, setState] = useState<UseListState<Attendance>>({
    data: [],
    isLoading: true,
    error: null,
    total: 0,
    page: 1,
    pageSize: 10,
  });

  const stableFilters = useStableFilters(filters);

  const loadRecords = useCallback(async () => {
    if (!enabled) {
      setState({
        data: [],
        isLoading: false,
        error: null,
        total: 0,
        page: 1,
        pageSize: 10,
      });
      return;
    }
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await api.attendance.getAttendanceRecords(filters);
      if (response.success && response.data) {
        setState({
          data: response.data,
          isLoading: false,
          error: null,
          total: response.data.length,
          page: 1,
          pageSize: response.data.length,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Failed to load attendance records',
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, stableFilters]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return {
    ...state,
    refetch: loadRecords,
  };
}

/**
 * Get attendance statistics
 */
export function useAttendanceStats() {
  const { api } = useAPI();
  const [state, setState] = useState<UseDataState<{
    averageAttendance: number;
    totalAttendees: number;
    attendanceRate: number;
  }>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.attendance.getAttendanceStats();
        if (response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load attendance stats',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadStats();
  }, []);

  return state;
}

// ============================================================================
// DONATIONS HOOKS
// ============================================================================

/**
 * Fetch donation records
 */
export function useDonations(
  page: number = 1,
  pageSize: number = 10,
  filters?: Record<string, unknown>
): UseListState<Donation> & { refetch: () => Promise<void> } {
  const { api } = useAPI();
  const [state, setState] = useState<Omit<UseListState<Donation>, 'refetch'>>({
    data: [],
    isLoading: true,
    error: null,
    total: 0,
    page,
    pageSize,
  });

  const stableFilters = useStableFilters(filters);

  const loadDonations = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await api.donations.getDonations({
        ...filters,
        page,
        pageSize,
      });
      if (response.success && response.data) {
        setState({
          data: response.data,
          isLoading: false,
          error: null,
          total: response.total || 0,
          page: response.page || page,
          pageSize: response.pageSize || pageSize,
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Failed to load donations',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, stableFilters]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  return {
    ...state,
    refetch: loadDonations,
  };
}

/**
 * Get donation statistics
 */
export function useDonationStats() {
  const { api } = useAPI();
  const [state, setState] = useState<UseDataState<{
    totalDonations: number;
    averageDonation: number;
    topDonor: string;
    monthlyTrend: Record<string, number>;
  }>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.donations.getDonationStats();
        if (response.success && response.data) {
          // Transform monthlyTrend from array to Record if needed
          const transformedData = {
            ...response.data,
            monthlyTrend: Array.isArray(response.data.monthlyTrend) 
              ? response.data.monthlyTrend.reduce((acc: Record<string, number>, item: any) => {
                  acc[item.name] = item.amount;
                  return acc;
                }, {})
              : response.data.monthlyTrend
          };
          setState({
            data: transformedData,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load donation stats',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadStats();
  }, []);

  return state;
}

// ============================================================================
// SERMONS HOOKS
// ============================================================================

/**
 * Fetch all sermons
 */
export function useSermons(filters?: Record<string, unknown>) {
  const { api } = useAPI();
  const [state, setState] = useState<UseListState<Sermon>>({
    data: [],
    isLoading: true,
    error: null,
    total: 0,
    page: 1,
    pageSize: 10,
  });

  const stableFilters = useStableFilters(filters);

  useEffect(() => {
    const loadSermons = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.sermons.getSermons(filters);
        if (response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
            total: response.data.length,
            page: 1,
            pageSize: response.data.length,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load sermons',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadSermons();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableFilters]);

  return state;
}

/**
 * Fetch single sermon by ID
 */
export function useSermon(id: number | null) {
  const { api } = useAPI();
  const [state, setState] = useState<UseDataState<Sermon>>({
    data: null,
    isLoading: !id,
    error: null,
  });

  useEffect(() => {
    if (!id) return;

    const loadSermon = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.sermons.getSermon(id);
        if (response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load sermon',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadSermon();
  }, [id]);

  return state;
}

// ============================================================================
// ANNOUNCEMENTS HOOKS
// ============================================================================

/**
 * Fetch all announcements
 */
export function useAnnouncements(filters?: Record<string, unknown>) {
  const { api } = useAPI();
  const [state, setState] = useState<UseListState<Announcement>>({
    data: [],
    isLoading: true,
    error: null,
    total: 0,
    page: 1,
    pageSize: 10,
  });

  const stableFilters = useStableFilters(filters);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.announcements.getAnnouncements(filters);
        if (response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
            total: response.data.length,
            page: 1,
            pageSize: response.data.length,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load announcements',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadAnnouncements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableFilters]);

  return state;
}

// ============================================================================
// REPORTS HOOKS
// ============================================================================

/**
 * Fetch all reports
 */
export function useReports(filters?: Record<string, unknown>) {
  const { api } = useAPI();
  const [state, setState] = useState<UseListState<Report>>({
    data: [],
    isLoading: true,
    error: null,
    total: 0,
    page: 1,
    pageSize: 10,
  });

  const stableFilters = useStableFilters(filters);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await api.reports.getReports(filters);
        if (response.success && response.data) {
          setState({
            data: response.data,
            isLoading: false,
            error: null,
            total: response.data.length,
            page: 1,
            pageSize: response.data.length,
          });
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to load reports',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

    loadReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableFilters]);

  return state;
}

// ============================================================================
// MUTATION HOOKS (for creating/updating/deleting)
// ============================================================================

/**
 * Create new member
 */
export function useCreateMember() {
  const { api } = useAPI();
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
  });

  const create = useCallback(
    async (member: MemberCreateInput) => {
      try {
        setState({ isLoading: true, error: null });
        const response = await api.members.createMember(member);
        if (response.success) {
          setState({ isLoading: false, error: null });
          return response.data;
        } else {
          setState({
            isLoading: false,
            error: response.error || 'Failed to create member',
          });
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({ isLoading: false, error: errorMessage });
        return null;
      }
    },
    [api]
  );

  return { ...state, create };
}

/**
 * Update member
 */
export function useUpdateMember(id: string | number) {
  const { api } = useAPI();
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
  });

  const update = useCallback(
    async (member: Partial<Member>) => {
      try {
        setState({ isLoading: true, error: null });
        const response = await api.members.updateMember(id, member);
        if (response.success) {
          setState({ isLoading: false, error: null });
          return response.data;
        } else {
          setState({
            isLoading: false,
            error: response.error || 'Failed to update member',
          });
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({ isLoading: false, error: errorMessage });
        return null;
      }
    },
    [api, id]
  );

  return { ...state, update };
}

/**
 * Create new event
 */
export function useCreateEvent() {
  const { api } = useAPI();
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
  });

  const create = useCallback(
    async (event: Omit<Event, 'id'>) => {
      try {
        setState({ isLoading: true, error: null });
        const response = await api.events.createEvent(event);
        if (response.success) {
          setState({ isLoading: false, error: null });
          return response.data;
        } else {
          setState({
            isLoading: false,
            error: response.error || 'Failed to create event',
          });
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({ isLoading: false, error: errorMessage });
        return null;
      }
    },
    [api]
  );

  return { ...state, create };
}

/**
 * Update event
 */
export function useUpdateEvent(id: string | number) {
  const { api } = useAPI();
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
  });

  const update = useCallback(
    async (event: Partial<Event>) => {
      try {
        setState({ isLoading: true, error: null });
        const response = await api.events.updateEvent(id, event);
        if (response.success) {
          setState({ isLoading: false, error: null });
          return response.data;
        } else {
          setState({
            isLoading: false,
            error: response.error || 'Failed to update event',
          });
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({ isLoading: false, error: errorMessage });
        return null;
      }
    },
    [api, id]
  );

  return { ...state, update };
}

/**
 * Delete event
 */
export function useDeleteEvent() {
  const { api } = useAPI();
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
  });

  const delete_ = useCallback(
    async (id: string | number) => {
      try {
        setState({ isLoading: true, error: null });
        const response = await api.events.deleteEvent(id);
        if (response.success) {
          setState({ isLoading: false, error: null });
          return true;
        } else {
          setState({
            isLoading: false,
            error: response.error || 'Failed to delete event',
          });
          return false;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({ isLoading: false, error: errorMessage });
        return false;
      }
    },
    [api]
  );

  return { ...state, delete: delete_ };
}

/**
 * Delete member
 */
export function useDeleteMember() {
  const { api } = useAPI();
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
  });

  const delete_ = useCallback(
    async (id: string) => {
      try {
        setState({ isLoading: true, error: null });
        const response = await api.members.deleteMember(id);
        if (response.success) {
          setState({ isLoading: false, error: null });
          return true;
        } else {
          setState({
            isLoading: false,
            error: response.error || 'Failed to delete member',
          });
          return false;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({ isLoading: false, error: errorMessage });
        return false;
      }
    },
    [api]
  );

  return { ...state, delete: delete_ };
}

/**
 * Record attendance
 */
export function useRecordAttendance() {
  const { api } = useAPI();
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
  });

  const record = useCallback(
    async (attendance: Omit<Attendance, 'id'>) => {
      try {
        setState({ isLoading: true, error: null });
        const response = await api.attendance.recordAttendance(attendance);
        if (response.success) {
          setState({ isLoading: false, error: null });
          return response.data;
        } else {
          setState({
            isLoading: false,
            error: response.error || 'Failed to record attendance',
          });
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({ isLoading: false, error: errorMessage });
        return null;
      }
    },
    [api]
  );

  return { ...state, record };
}

/**
 * Update attendance record
 */
export function useUpdateAttendance() {
  const { api } = useAPI();
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
  });

  const update = useCallback(
    async (id: string | number, attendance: Partial<Attendance>) => {
      try {
        setState({ isLoading: true, error: null });
        const response = await api.attendance.updateAttendance(id, attendance);
        if (response.success) {
          setState({ isLoading: false, error: null });
          return response.data;
        } else {
          setState({
            isLoading: false,
            error: response.error || 'Failed to update attendance',
          });
          return null;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An error occurred';
        setState({ isLoading: false, error: errorMessage });
        return null;
      }
    },
    [api]
  );

  return { ...state, update };
}

