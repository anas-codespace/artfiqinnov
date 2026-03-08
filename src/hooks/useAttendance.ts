import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceStats {
  totalWorkingDays: number;
  daysPresent: number;
  percentage: number;
  todayStatus: 'not_checked' | 'present' | 'leave';
  todayPunchTime: string | null;
  todayHoliday: string | null;
  isLoading: boolean;
}

/**
 * Count working days (Mon-Fri) between two dates, excluding company holidays and approved leaves.
 */
function countWorkingDays(startDate: Date, endDate: Date, holidayDates: Set<string>, approvedLeaveDates?: Set<string>): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const day = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    if (day !== 0 && day !== 6 && !holidayDates.has(dateStr) && !(approvedLeaveDates?.has(dateStr))) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Expand a date range into individual date strings.
 */
function expandDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export interface CompanyHoliday {
  id: string;
  date: string;
  title: string;
  declared_by: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  reviewed_by: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanyHolidays() {
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHolidays = useCallback(async () => {
    const { data } = await supabase
      .from('company_holidays')
      .select('*')
      .order('date', { ascending: true });
    setHolidays(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchHolidays();
    const channel = supabase
      .channel('company-holidays')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_holidays' }, () => {
        fetchHolidays();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchHolidays]);

  return { holidays, isLoading, refetch: fetchHolidays };
}

export function useLeaveRequests(userId?: string) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaves = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setLeaves((data as LeaveRequest[]) || []);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchLeaves();
    if (!userId) return;
    const channel = supabase
      .channel(`leave-requests-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests', filter: `user_id=eq.${userId}` }, () => {
        fetchLeaves();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchLeaves]);

  return { leaves, isLoading, refetch: fetchLeaves };
}

export function useAllLeaveRequests() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaves = useCallback(async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setLeaves((data as LeaveRequest[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaves();
    const channel = supabase
      .channel('all-leave-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        fetchLeaves();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaves]);

  return { leaves, isLoading, refetch: fetchLeaves };
}

export function useAttendance(userId: string | undefined, joinDate?: string) {
  const [stats, setStats] = useState<AttendanceStats>({
    totalWorkingDays: 0,
    daysPresent: 0,
    percentage: 0,
    todayStatus: 'not_checked',
    todayPunchTime: null,
    todayHoliday: null,
    isLoading: true,
  });

  const fetchAttendance = useCallback(async () => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];

    const [{ data: logs, error }, { data: holidays }, { data: approvedLeaves }] = await Promise.all([
      supabase.from('attendance_logs').select('*').eq('user_id', userId),
      supabase.from('company_holidays').select('*'),
      supabase.from('leave_requests').select('start_date, end_date').eq('user_id', userId).eq('status', 'approved'),
    ]);

    if (error) {
      console.error('Error fetching attendance:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const holidayDates = new Set((holidays || []).map(h => h.date));
    const todayHolidayEntry = (holidays || []).find(h => h.date === today);

    // Build approved leave dates set
    const approvedLeaveDates = new Set<string>();
    ((approvedLeaves as Array<{ start_date: string; end_date: string }>) || []).forEach(l => {
      expandDateRange(l.start_date, l.end_date).forEach(d => approvedLeaveDates.add(d));
    });

    const start = joinDate ? new Date(joinDate) : new Date();
    const now = new Date();
    const totalWorkingDays = countWorkingDays(start, now, holidayDates, approvedLeaveDates);

    const daysPresent = (logs || []).filter(l => l.status === 'Present').length;
    const percentage = totalWorkingDays > 0 ? Math.round((daysPresent / totalWorkingDays) * 100) : 100;

    const todayLog = (logs || []).find(l => l.date === today);
    const todayStatus = todayLog
      ? todayLog.status === 'Present' ? 'present' : 'leave'
      : 'not_checked';

    setStats({
      totalWorkingDays,
      daysPresent,
      percentage: Math.min(percentage, 100),
      todayStatus: todayStatus as 'not_checked' | 'present' | 'leave',
      todayPunchTime: todayLog?.punch_in_time || null,
      todayHoliday: todayHolidayEntry?.title || null,
      isLoading: false,
    });
  }, [userId, joinDate]);

  useEffect(() => {
    fetchAttendance();

    if (!userId) return;
    const channel = supabase
      .channel(`attendance-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs', filter: `user_id=eq.${userId}` }, () => { fetchAttendance(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_holidays' }, () => { fetchAttendance(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests', filter: `user_id=eq.${userId}` }, () => { fetchAttendance(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchAttendance]);

  const punchIn = useCallback(async () => {
    if (!userId) return false;
    const { error } = await supabase
      .from('attendance_logs')
      .insert({ user_id: userId, status: 'Present' });

    if (error) {
      console.error('Punch in error:', error);
      return false;
    }
    await fetchAttendance();
    return true;
  }, [userId, fetchAttendance]);

  return { ...stats, punchIn, refetch: fetchAttendance };
}

/**
 * Bulk fetch attendance percentages for multiple users (holiday + leave aware).
 */
export async function fetchTeamAttendance(
  userIds: string[],
  joinDates: Record<string, string>
): Promise<Record<string, { percentage: number; daysPresent: number; totalDays: number }>> {
  if (userIds.length === 0) return {};

  const [{ data: logs }, { data: holidays }, { data: approvedLeaves }] = await Promise.all([
    supabase.from('attendance_logs').select('user_id, status, date').in('user_id', userIds).eq('status', 'Present'),
    supabase.from('company_holidays').select('date'),
    supabase.from('leave_requests').select('user_id, start_date, end_date').in('user_id', userIds).eq('status', 'approved'),
  ]);

  const holidayDates = new Set((holidays || []).map(h => h.date));

  // Build per-user approved leave date sets
  const userLeaveDates: Record<string, Set<string>> = {};
  ((approvedLeaves as Array<{ user_id: string; start_date: string; end_date: string }>) || []).forEach(l => {
    if (!userLeaveDates[l.user_id]) userLeaveDates[l.user_id] = new Set();
    expandDateRange(l.start_date, l.end_date).forEach(d => userLeaveDates[l.user_id].add(d));
  });

  const now = new Date();
  const result: Record<string, { percentage: number; daysPresent: number; totalDays: number }> = {};

  userIds.forEach(uid => {
    const start = joinDates[uid] ? new Date(joinDates[uid]) : now;
    const totalDays = countWorkingDays(start, now, holidayDates, userLeaveDates[uid]);
    const daysPresent = (logs || []).filter(l => l.user_id === uid).length;
    const percentage = totalDays > 0 ? Math.min(Math.round((daysPresent / totalDays) * 100), 100) : 100;
    result[uid] = { percentage, daysPresent, totalDays };
  });

  return result;
}
