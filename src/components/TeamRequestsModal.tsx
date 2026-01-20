import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Check, X, Loader2, UserPlus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { springPresets } from '@/components/ui/spring-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import defaultAvatar from '@/assets/default-avatar.webp';

interface PendingUser {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

interface TeamRequestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamRequestsModal({ open, onOpenChange }: TeamRequestsModalProps) {
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, avatar_url, email, created_at')
      .eq('access_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending users:', error);
    } else {
      setPendingUsers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchPendingUsers();
    }
  }, [open]);

  const handleApprove = async (user: PendingUser) => {
    setProcessingId(user.id);

    try {
      // Update access_status to approved_member
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ access_status: 'approved_member' })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Create role entry (team member)
      await supabase.from('user_roles').upsert({
        user_id: user.user_id,
        role: 'team',
      }, { onConflict: 'user_id,role' });

      // Send welcome notification
      await supabase.from('notifications').insert({
        user_id: user.user_id,
        title: 'Welcome to the Team! 🎉',
        message: 'Your access request has been approved. You now have full team member access.',
        type: 'welcome',
        link: '/chat',
      });

      toast({
        title: 'User Approved',
        description: `${user.display_name || user.email} has been granted team access.`,
      });

      // Remove from local state
      setPendingUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    }

    setProcessingId(null);
  };

  const handleReject = async (user: PendingUser) => {
    setProcessingId(user.id);

    try {
      // Update access_status back to visitor
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ access_status: 'visitor' })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Send rejection notification
      await supabase.from('notifications').insert({
        user_id: user.user_id,
        title: 'Access Request Update',
        message: 'Your team access request was not approved at this time.',
        type: 'info',
      });

      toast({
        title: 'Request Rejected',
        description: `${user.display_name || user.email}'s request has been rejected.`,
      });

      // Remove from local state
      setPendingUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive',
      });
    }

    setProcessingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
            <span className="truncate">Team Access Requests</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 sm:py-4 space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto scrollbar-cyber">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No pending access requests</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {pendingUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ ...springPresets.snappy, delay: index * 0.05 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-secondary/50 rounded-xl border border-border/50"
                >
                  {/* User Info Row */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <img
                      src={user.avatar_url || defaultAvatar}
                      alt={user.display_name || 'User'}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-primary/30 object-cover flex-shrink-0"
                    />

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {user.display_name || 'Unknown User'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {user.email || 'No email'}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-warning">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          Requested {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(user)}
                      disabled={processingId === user.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 flex-1 sm:flex-none"
                    >
                      {processingId === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          <span className="sm:hidden ml-1">Reject</span>
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user)}
                      disabled={processingId === user.id}
                      className="gap-1 flex-1 sm:flex-none"
                    >
                      {processingId === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
