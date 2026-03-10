import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Loader2, PartyPopper, CalendarDays, ChevronDown, LogOut as LogOutIcon, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { springPresets } from '@/components/ui/spring-config';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';
import { LeaveRequestCard } from '@/components/LeaveRequestCard';

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function PunchInCard() {
  const { user } = useAuth();
  const { isMember } = useUserStatus();
  const { toast } = useToast();
  const [joinDate, setJoinDate] = useState<string | undefined>();
  const [punching, setPunching] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [liveMinutes, setLiveMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('created_at').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setJoinDate(data.created_at); });
  }, [user?.id]);

  const { todayStatus, todayPunchTime, todayPunchOutTime, todayWorkMinutes, todayHoliday, todaySessions, percentage, daysPresent, totalWorkingDays, isLoading, punchIn, punchOut } = useAttendance(
    user?.id,
    joinDate
  );

  // Live timer: sum all closed sessions + live active session
  useEffect(() => {
    if (todayStatus !== 'present') {
      setLiveMinutes(todayWorkMinutes);
      return;
    }
    const update = () => {
      let total = 0;
      for (const s of todaySessions) {
        if (s.minutes) {
          total += s.minutes;
        } else if (!s.punch_out) {
          total += Math.round((Date.now() - new Date(s.punch_in).getTime()) / 60000);
        }
      }
      setLiveMinutes(total);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [todayStatus, todaySessions, todayWorkMinutes]);

  if (!isMember) return null;

  const handlePunchIn = async () => {
    setPunching(true);
    const success = await punchIn();
    if (success) {
      toast({ title: '✅ Checked In!', description: todaySessions.length > 0 ? 'New session started.' : 'Attendance marked for today.' });
    } else {
      toast({ title: 'Error', description: 'Failed to check in.', variant: 'destructive' });
    }
    setPunching(false);
  };

  const handlePunchOut = async () => {
    setPunching(true);
    const success = await punchOut();
    if (success) {
      toast({ title: '👋 Checked Out!', description: 'Session ended. You can check in again if needed.' });
    } else {
      toast({ title: 'Error', description: 'Failed to check out.', variant: 'destructive' });
    }
    setPunching(false);
  };

  // Find active session's punch-in time for display
  const activeSession = todaySessions.find(s => !s.punch_out);
  const activePunchTime = activeSession
    ? new Date(activeSession.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const getHealthColor = () => {
    if (percentage > 90) return 'text-emerald-400';
    if (percentage >= 75) return 'text-amber-400';
    return 'text-rose-500';
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-5 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Holiday card
  if (todayHoliday) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springPresets.snappy}
        className="glass-card rounded-2xl p-5 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-amber-400">🎉 Company Holiday</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{todayHoliday}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Enjoy your day off!</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.snappy}
      className="glass-card rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Daily Check-In</h3>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className={`text-xs font-bold px-2.5 py-1 rounded-full bg-card/60 border border-border/50 backdrop-blur-md ${getHealthColor()}`}>
            {percentage}%
          </div>
        </div>

        {todayStatus === 'present' ? (
          /* Currently checked in — show active session + check out button */
          <div className="space-y-2">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-400">Checked In</p>
                <p className="text-xs text-muted-foreground">
                  at {activePunchTime} {liveMinutes !== null && <span className="text-primary">· {formatDuration(liveMinutes)} total today</span>}
                </p>
              </div>
            </motion.div>
            <motion.button
              onClick={handlePunchOut}
              disabled={punching}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold text-sm
                hover:bg-amber-500/30 transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {punching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogOutIcon className="w-4 h-4" />
                  Check Out
                </>
              )}
            </motion.button>
          </div>
        ) : todayStatus === 'checked_out' ? (
          /* All sessions closed — show summary + allow re-check-in */
          <div className="space-y-2">
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50"
            >
              <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''} today
                </p>
                <p className="text-xs text-muted-foreground">
                  Total: <span className="text-primary font-semibold">{liveMinutes ? formatDuration(liveMinutes) : '—'}</span>
                </p>
              </div>
            </motion.div>
            <motion.button
              onClick={handlePunchIn}
              disabled={punching}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-primary font-semibold text-sm
                hover:bg-primary/30 hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)] transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {punching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Resume / New Session
                </>
              )}
            </motion.button>
          </div>
        ) : (
          /* Not checked in at all today */
          <motion.button
            onClick={handlePunchIn}
            disabled={punching}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-primary/20 border border-primary/40 text-primary font-semibold text-sm
              hover:bg-primary/30 hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)] transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {punching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Clock className="w-4 h-4" />
                Punch In
              </>
            )}
          </motion.button>
        )}

        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>{daysPresent} / {totalWorkingDays} working days</span>
          <span className={getHealthColor()}>
            {percentage > 90 ? 'Excellent' : percentage >= 75 ? 'Good' : 'Needs Improvement'}
          </span>
        </div>

        {/* Session breakdown (if multiple sessions today) */}
        {todaySessions.length > 1 && (
          <div className="mt-2 space-y-1">
            {todaySessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span>Session {i + 1}: {new Date(s.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {s.punch_out ? new Date(s.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</span>
                <span className="text-primary font-medium">{s.minutes ? formatDuration(s.minutes) : '…'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Calendar Toggle */}
        <motion.button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full mt-3 py-2 rounded-xl bg-secondary/30 border border-border/30 text-muted-foreground text-xs font-medium
            hover:bg-secondary/50 transition-colors flex items-center justify-center gap-1.5"
          whileTap={{ scale: 0.98 }}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          {showCalendar ? 'Hide Calendar' : 'View Calendar / Details'}
          <motion.div animate={{ rotate: showCalendar ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </motion.button>
      </div>

      {/* Collapsible Attendance Calendar */}
      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-4">
              <AttendanceCalendar />
              <div className="border-t border-border/50 pt-4">
                <LeaveRequestCard embedded />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
