import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { springPresets } from '@/components/ui/spring-config';
import { supabase } from '@/integrations/supabase/client';

export function PunchInCard() {
  const { user } = useAuth();
  const { isMember } = useUserStatus();
  const { toast } = useToast();
  const [joinDate, setJoinDate] = useState<string | undefined>();
  const [punching, setPunching] = useState(false);

  // Fetch join date from profiles
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('created_at').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setJoinDate(data.created_at); });
  }, [user?.id]);

  const { todayStatus, todayPunchTime, percentage, daysPresent, totalWorkingDays, isLoading, punchIn } = useAttendance(
    user?.id,
    joinDate
  );

  if (!isMember) return null;

  const handlePunchIn = async () => {
    setPunching(true);
    const success = await punchIn();
    if (success) {
      toast({ title: '✅ Checked In!', description: `Attendance marked for today.` });
    } else {
      toast({ title: 'Error', description: 'Failed to check in. You may have already checked in today.', variant: 'destructive' });
    }
    setPunching(false);
  };

  const punchTime = todayPunchTime
    ? new Date(todayPunchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Determine attendance health color
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
          {/* Attendance percentage pill */}
          <div className={`text-xs font-bold px-2.5 py-1 rounded-full bg-card/60 border border-border/50 backdrop-blur-md ${getHealthColor()}`}>
            {percentage}%
          </div>
        </div>

        {todayStatus === 'present' ? (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Checked In</p>
              <p className="text-xs text-muted-foreground">at {punchTime}</p>
            </div>
          </motion.div>
        ) : (
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

        {/* Stats row */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>{daysPresent} / {totalWorkingDays} working days</span>
          <span className={getHealthColor()}>
            {percentage > 90 ? 'Excellent' : percentage >= 75 ? 'Good' : 'Needs Improvement'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
