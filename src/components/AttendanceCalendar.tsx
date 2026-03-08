import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { springPresets } from '@/components/ui/spring-config';

interface AttendanceLog {
  date: string;
  status: string;
}

interface Holiday {
  date: string;
  title: string;
}

interface LeaveRange {
  start_date: string;
  end_date: string;
}

export function AttendanceCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveRange[]>([]);
  const [joinDate, setJoinDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      const startOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endOfMonth = new Date(year, month + 1, 0);
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

      const [{ data: logData }, { data: holidayData }, { data: profile }, { data: leaveData }] = await Promise.all([
        supabase.from('attendance_logs').select('date, status').eq('user_id', user.id).gte('date', startOfMonth).lte('date', endStr),
        supabase.from('company_holidays').select('date, title').gte('date', startOfMonth).lte('date', endStr),
        supabase.from('profiles').select('created_at').eq('user_id', user.id).single(),
        supabase.from('leave_requests').select('start_date, end_date').eq('user_id', user.id).eq('status', 'approved'),
      ]);

      setLogs(logData || []);
      setHolidays(holidayData || []);
      setApprovedLeaves((leaveData as LeaveRange[]) || []);
      if (profile) setJoinDate(profile.created_at.split('T')[0]);
      setIsLoading(false);
    };

    fetchData();
  }, [user?.id, year, month]);

  const logMap = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach(l => map.set(l.date, l.status));
    return map;
  }, [logs]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach(h => map.set(h.date, h.title));
    return map;
  }, [holidays]);

  // Build approved leave dates set
  const leaveDates = useMemo(() => {
    const set = new Set<string>();
    approvedLeaves.forEach(l => {
      const current = new Date(l.start_date + 'T00:00:00');
      const end = new Date(l.end_date + 'T00:00:00');
      while (current <= end) {
        set.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });
    return set;
  }, [approvedLeaves]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];
    const days: Array<{ date: string; day: number; status: 'present' | 'absent' | 'holiday' | 'weekend' | 'future' | 'before_join' | null }> = [];

    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, status: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFuture = dateStr > today;
      const isBeforeJoin = joinDate ? dateStr < joinDate : false;

      let status: 'present' | 'absent' | 'holiday' | 'weekend' | 'future' | 'before_join';

      if (isFuture) {
        status = 'future';
      } else if (isBeforeJoin) {
        status = 'before_join';
      } else if (isWeekend) {
        status = 'weekend';
      } else if (holidayMap.has(dateStr)) {
        status = 'holiday';
      } else if (logMap.get(dateStr) === 'Present') {
        status = 'present';
      } else {
        status = 'absent';
      }

      days.push({ date: dateStr, day: d, status });
    }

    return days;
  }, [year, month, logMap, holidayMap, joinDate]);

  const monthLabel = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => {
    const now = new Date();
    const next = new Date(year, month + 1, 1);
    if (next <= new Date(now.getFullYear(), now.getMonth() + 1, 1)) {
      setCurrentMonth(next);
    }
  };

  const getStatusDot = (status: string | null) => {
    switch (status) {
      case 'present': return 'bg-emerald-400';
      case 'absent': return 'bg-rose-500';
      case 'holiday': return 'bg-amber-400';
      case 'weekend': return 'bg-muted-foreground/30';
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.snappy}
      className="glass-card rounded-2xl p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Attendance Calendar</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-secondary/50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-medium min-w-[120px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-secondary/50 transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <span key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, i) => {
              if (!cell.day) return <div key={i} />;

              const today = new Date().toISOString().split('T')[0];
              const isToday = cell.date === today;

              return (
                <div
                  key={i}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] transition-colors
                    ${isToday ? 'bg-primary/10 border border-primary/30' : ''}
                    ${cell.status === 'future' || cell.status === 'before_join' ? 'opacity-30' : ''}
                  `}
                  title={cell.status === 'holiday' ? holidayMap.get(cell.date) : cell.status || ''}
                >
                  <span className={`${isToday ? 'font-bold text-primary' : 'text-foreground'}`}>{cell.day}</span>
                  {cell.status && cell.status !== 'future' && cell.status !== 'before_join' && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${getStatusDot(cell.status)}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Present</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Absent</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Holiday</div>
          </div>
        </>
      )}
    </motion.div>
  );
}
