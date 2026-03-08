import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileWarning, Shield, Loader2, Lock, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { springPresets } from '@/components/ui/spring-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VaultAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileId: string;
  onAccessGranted?: () => void;
}

type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'loading';

export function VaultAccessModal({
  open,
  onOpenChange,
  fileName,
  fileId,
  onAccessGranted,
}: VaultAccessModalProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<RequestStatus>('loading');
  const [isRequesting, setIsRequesting] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user || !fileId) return;
    setStatus('loading');

    const { data } = await supabase
      .from('vault_access_requests')
      .select('status')
      .eq('user_id', user.id)
      .eq('file_id', fileId)
      .maybeSingle();

    if (data) {
      setStatus(data.status as RequestStatus);
      if (data.status === 'approved') {
        onAccessGranted?.();
        onOpenChange(false);
      }
    } else {
      setStatus('none');
    }
  }, [user, fileId]);

  useEffect(() => {
    if (open) checkStatus();
  }, [open, checkStatus]);

  // Realtime subscription for status updates
  useEffect(() => {
    if (!open || !user || !fileId) return;
    const channel = supabase
      .channel(`vault-access-${fileId}-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vault_access_requests',
        filter: `file_id=eq.${fileId}`,
      }, (payload) => {
        const row = payload.new as { user_id: string; status: string };
        if (row.user_id === user.id) {
          setStatus(row.status as RequestStatus);
          if (row.status === 'approved') {
            toast({ title: '✅ Access Granted', description: `You can now view "${fileName}"` });
            onAccessGranted?.();
            onOpenChange(false);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, user, fileId]);

  const handleRequestAccess = async () => {
    if (!user || !profile) return;
    setIsRequesting(true);

    try {
      // Insert request
      const { error } = await supabase.from('vault_access_requests').insert({
        user_id: user.id,
        file_id: fileId,
      });

      if (error) throw error;

      // Notify founders
      const { data: founders } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['ceo', 'cto']);

      if (founders?.length) {
        const displayName = profile.display_name || user.email?.split('@')[0] || 'Unknown';
        await supabase.from('notifications').insert(
          founders.map(f => ({
            user_id: f.user_id,
            title: 'Vault Access Request',
            message: `${displayName} requested access to: ${fileName}`,
            type: 'vault_access',
            link: '/admin-console',
          }))
        );
      }

      setStatus('pending');
      toast({ title: '📋 Request Sent', description: 'Founders have been notified.' });
    } catch (error: any) {
      console.error('Error requesting vault access:', error);
      toast({ title: 'Request Failed', description: error.message, variant: 'destructive' });
    }

    setIsRequesting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileWarning className="w-5 h-5 text-primary flex-shrink-0" />
            Restricted File
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPresets.snappy}
          className="py-2 space-y-4"
        >
          <div className="p-4 bg-secondary/50 rounded-xl border border-border/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Document:</p>
            <p className="font-medium text-sm break-words">{fileName}</p>
          </div>

          {status === 'loading' && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === 'none' && (
            <>
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <p className="text-center text-muted-foreground text-xs leading-relaxed">
                  This file requires permission from the Founders. Request one-time access below.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2 text-sm" onClick={handleRequestAccess} disabled={isRequesting}>
                  {isRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Request Access
                </Button>
              </div>
            </>
          )}

          {status === 'pending' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-amber-400">⏳ Request Pending</p>
              <p className="text-xs text-muted-foreground text-center">
                Waiting for founder approval. You'll be notified when access is granted.
              </p>
              <Button variant="outline" className="text-sm mt-2" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          {status === 'rejected' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                <Lock className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive">Access Denied</p>
              <p className="text-xs text-muted-foreground text-center">
                Your request was denied by the Founders.
              </p>
              <Button variant="outline" className="text-sm mt-2" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}

          {status === 'approved' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">Access Granted</p>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
