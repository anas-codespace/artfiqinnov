import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut as LogOutIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface PunchOutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onConfirm: () => Promise<void>;
}

export function PunchOutModal({ open, onOpenChange, userId, onConfirm }: PunchOutModalProps) {
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (summary.trim().length < 5) return;
    
    setSubmitting(true);
    
    // Save the work summary
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('daily_work_logs')
      .upsert({
        user_id: userId,
        date: today,
        summary: summary.trim(),
      }, { onConflict: 'user_id,date' });

    // Perform the actual punch out
    await onConfirm();
    
    setSummary('');
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOutIcon className="w-5 h-5 text-amber-400" />
            Check Out — Daily Summary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Before checking out, share a brief update on what you achieved today.
          </p>
          
          <Textarea
            placeholder="What was achieved today? (e.g., Completed UI design for dashboard, Fixed login bug...)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            maxLength={500}
            className="resize-none bg-secondary/30 border-border/50"
          />
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {summary.length}/500 characters
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmit} 
                disabled={summary.trim().length < 5 || submitting}
                className="bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check Out'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
