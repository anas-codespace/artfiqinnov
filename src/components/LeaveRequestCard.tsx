import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Send, Loader2, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveRequests } from '@/hooks/useAttendance';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { springPresets } from '@/components/ui/spring-config';

export function LeaveRequestCard() {
  const { user } = useAuth();
  const { isMember } = useUserStatus();
  const { toast } = useToast();
  const { leaves, isLoading, refetch } = useLeaveRequests(user?.id);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (!isMember) return null;

  const handleSubmit = async () => {
    if (!user?.id || !startDate || !endDate || !reason.trim()) return;
    if (endDate < startDate) {
      toast({ title: 'Error', description: 'End date must be after start date', variant: 'destructive' });
      return;
    }
    if (reason.trim().length > 500) {
      toast({ title: 'Error', description: 'Reason must be under 500 characters', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('leave_requests').insert({
      user_id: user.id,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      reason: reason.trim(),
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit leave request', variant: 'destructive' });
    } else {
      toast({ title: '📋 Request Submitted', description: 'Your leave request has been sent for approval.' });
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
      setShowForm(false);
      refetch();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('leave_requests').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Leave request removed' });
      refetch();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.snappy}
      className="glass-card rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Leave Requests</h3>
            <p className="text-xs text-muted-foreground">Request time off</p>
          </div>
        </div>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="text-xs">
            New Request
          </Button>
        )}
      </div>

      {/* New request form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 p-3 rounded-xl bg-secondary/30 border border-border/50"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left text-xs h-8", !startDate && "text-muted-foreground")}>
                    {startDate ? format(startDate, 'MMM d') : 'Start'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left text-xs h-8", !endDate && "text-muted-foreground")}>
                    {endDate ? format(endDate, 'MMM d') : 'End'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < (startDate || new Date())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <Label className="text-xs">Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family event, medical appointment..."
              className="h-8 text-xs"
              maxLength={500}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !startDate || !endDate || !reason.trim()}
              className="flex-1 gap-1.5 text-xs"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Submit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-xs">
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Leave history */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : leaves.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No leave requests yet</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {leaves.slice(0, 5).map((leave) => (
            <div key={leave.id} className="flex items-center justify-between p-2.5 rounded-lg bg-card/50 border border-border/30">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium truncate">{leave.reason}</p>
                  {getStatusBadge(leave.status)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(leave.start_date + 'T00:00:00'), 'MMM d')} — {format(new Date(leave.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                </p>
                {leave.reviewer_note && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">Note: {leave.reviewer_note}</p>
                )}
              </div>
              {leave.status === 'pending' && (
                <Button size="icon" variant="ghost" className="w-6 h-6 flex-shrink-0" onClick={() => handleDelete(leave.id)}>
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
