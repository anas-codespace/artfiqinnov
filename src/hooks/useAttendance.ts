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
 * Count working days (Mon-Fri) between two dates, excluding company holidays.
 */
function countWorkingDays(startDate: Date, endDate: Date, holidayDates: Set<string>): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const day = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    if (day !== 0 && day !== 6 && !holidayDates.has(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export interface CompanyHoliday {
  id: string;
  date: string;
  title: string;
  declared_by: string;
  created_at: string;
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

    // Fetch attendance logs and holidays in parallel
    const [{ data: logs, error }, { data: holidays }] = await Promise.all([
      supabase.from('attendance_logs').select('*').eq('user_id', userId),
      supabase.from('company_holidays').select('*'),
    ]);

    if (error) {
      console.error('Error fetching attendance:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Build holiday date set
    const holidayDates = new Set((holidays || []).map(h => h.date));

    // Check if today is a holiday
    const todayHolidayEntry = (holidays || []).find(h => h.date === today);

    const start = joinDate ? new Date(joinDate) : new Date();
    const now = new Date();
    const totalWorkingDays = countWorkingDays(start, now, holidayDates);

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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_logs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchAttendance();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'company_holidays',
      }, () => {
        fetchAttendance();
      })
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
 * Bulk fetch attendance percentages for multiple users (holiday-aware).
 */
export async function fetchTeamAttendance(
  userIds: string[],
  joinDates: Record<string, string>
): Promise<Record<string, { percentage: number; daysPresent: number; totalDays: number }>> {
  if (userIds.length === 0) return {};

  const [{ data: logs }, { data: holidays }] = await Promise.all([
    supabase.from('attendance_logs').select('user_id, status, date').in('user_id', userIds).eq('status', 'Present'),
    supabase.from('company_holidays').select('date'),
  ]);

  const holidayDates = new Set((holidays || []).map(h => h.date));
  const now = new Date();
  const result: Record<string, { percentage: number; daysPresent: number; totalDays: number }> = {};

  userIds.forEach(uid => {
    const start = joinDates[uid] ? new Date(joinDates[uid]) : now;
    const totalDays = countWorkingDays(start, now, holidayDates);
    const daysPresent = (logs || []).filter(l => l.user_id === uid).length;
    const percentage = totalDays > 0 ? Math.min(Math.round((daysPresent / totalDays) * 100), 100) : 100;
    result[uid] = { percentage, daysPresent, totalDays };
  });

  return result;
}
