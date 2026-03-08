import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { fetchUserWorkLogs } from '@/hooks/useAttendance';
import { format } from 'date-fns';
import defaultAvatar from '@/assets/default-avatar.webp';

interface MemberInsightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function MemberInsightModal({ open, onOpenChange, member }: MemberInsightModalProps) {
  const [logs, setLogs] = useState<Array<{ date: string; work_duration_minutes: number | null; punch_in_time: string; punch_out_time: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !member) return;
    setLoading(true);
    fetchUserWorkLogs(member.user_id).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, [open, member?.user_id]);

  const logsWithDuration = logs.filter(l => l.work_duration_minutes && l.work_duration_minutes > 0);
  const totalMinutes = logsWithDuration.reduce((sum, l) => sum + (l.work_duration_minutes || 0), 0);
  const avgMinutes = logsWithDuration.length > 0 ? Math.round(totalMinutes / logsWithDuration.length) : 0;
  const maxMinutes = logsWithDuration.length > 0 ? Math.max(...logsWithDuration.map(l => l.work_duration_minutes || 0)) : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={member?.avatar_url || defaultAvatar} />
              <AvatarFallback>{(member?.display_name || 'U')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold">{member?.display_name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground font-normal">Performance Insight</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-primary">{formatDuration(avgMinutes)}</p>
                <p className="text-[10px] text-muted-foreground">Avg / Day</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-400">{formatDuration(totalMinutes)}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-center">
                <BarChart3 className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-bold">{logsWithDuration.length}</p>
                <p className="text-[10px] text-muted-foreground">Days Tracked</p>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Daily Work Hours (Last 30 Days)
              </h3>
              {logsWithDuration.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No checkout data yet. Work hours are recorded when team members check out.</p>
              ) : (
                <div className="space-y-2">
                  {logsWithDuration.map((log, i) => {
                    const pct = maxMinutes > 0 ? ((log.work_duration_minutes || 0) / maxMinutes) * 100 : 0;
                    return (
                      <motion.div
                        key={log.date}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
                          {format(new Date(log.date + 'T00:00:00'), 'MMM d, EEE')}
                        </span>
                        <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-primary/60"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(pct, 3)}%` }}
                            transition={{ duration: 0.5, delay: i * 0.03 }}
                          />
                        </div>
                        <span className="text-xs font-medium w-14 text-right">
                          {formatDuration(log.work_duration_minutes || 0)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
