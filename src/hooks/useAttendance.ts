import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceStats {
  totalWorkingDays: number;
  daysPresent: number;
  percentage: number;
  todayStatus: 'not_checked' | 'present' | 'leave';
  todayPunchTime: string | null;
  isLoading: boolean;
}

/**
 * Calculate working days (Mon-Fri) between two dates, inclusive.
 */
function countWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function useAttendance(userId: string | undefined, joinDate?: string) {
  const [stats, setStats] = useState<AttendanceStats>({
    totalWorkingDays: 0,
    daysPresent: 0,
    percentage: 0,
    todayStatus: 'not_checked',
    todayPunchTime: null,
    isLoading: true,
  });

  const fetchAttendance = useCallback(async () => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];

    // Fetch all attendance logs for this user
    const { data: logs, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching attendance:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Calculate join date
    const start = joinDate ? new Date(joinDate) : new Date();
    const now = new Date();
    const totalWorkingDays = countWorkingDays(start, now);

    // Count present days
    const daysPresent = (logs || []).filter(l => l.status === 'Present').length;
    const percentage = totalWorkingDays > 0 ? Math.round((daysPresent / totalWorkingDays) * 100) : 100;

    // Check today's status
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
      isLoading: false,
    });
  }, [userId, joinDate]);

  useEffect(() => {
    fetchAttendance();

    // Subscribe to real-time updates
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
 * Bulk fetch attendance percentages for multiple users.
 */
export async function fetchTeamAttendance(
  userIds: string[],
  joinDates: Record<string, string>
): Promise<Record<string, { percentage: number; daysPresent: number; totalDays: number }>> {
  if (userIds.length === 0) return {};

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('user_id, status, date')
    .in('user_id', userIds)
    .eq('status', 'Present');

  const now = new Date();
  const result: Record<string, { percentage: number; daysPresent: number; totalDays: number }> = {};

  userIds.forEach(uid => {
    const start = joinDates[uid] ? new Date(joinDates[uid]) : now;
    const totalDays = countWorkingDays(start, now);
    const daysPresent = (logs || []).filter(l => l.user_id === uid).length;
    const percentage = totalDays > 0 ? Math.min(Math.round((daysPresent / totalDays) * 100), 100) : 100;
    result[uid] = { percentage, daysPresent, totalDays };
  });

  return result;
}
