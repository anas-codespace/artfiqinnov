import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileWarning, Shield, Loader2 } from 'lucide-react';
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
}

export function VaultAccessModal({ 
  open, 
  onOpenChange, 
  fileName,
  fileId 
}: VaultAccessModalProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestAccess = async () => {
    if (!user || !profile) return;

    setIsRequesting(true);

    try {
      // Get founder user IDs
      const { data: founders } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['ceo', 'cto']);

      if (founders && founders.length > 0) {
        // Create notifications for each founder
        const notifications = founders.map(f => ({
          user_id: f.user_id,
          title: 'File Access Request',
          message: `${profile.display_name || user.email} requested access to: ${fileName}`,
          type: 'file_access',
          link: '/vault',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Also create a founder alert for better tracking
      await supabase.from('founder_alerts').insert({
        type: 'file_access_request',
        message: `One-time access requested for: ${fileName}`,
        triggered_by: user.id,
        triggered_by_name: profile.display_name || user.email?.split('@')[0] || 'Unknown',
        file_id: fileId,
      });

      toast({
        title: 'Access Requested',
        description: 'The founders have been notified of your request.',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error requesting file access:', error);
      toast({
        title: 'Request Failed',
        description: 'Could not send access request. Please try again.',
        variant: 'destructive',
      });
    }

    setIsRequesting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm mx-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileWarning className="w-4 h-4 sm:w-5 sm:h-5 text-warning flex-shrink-0" />
            <span className="truncate">Restricted File</span>
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPresets.snappy}
          className="py-2 sm:py-4 space-y-4 sm:space-y-6"
        >
          {/* File info */}
          <div className="p-3 sm:p-4 bg-secondary/50 rounded-xl border border-border/50 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Requested File:</p>
            <p className="font-medium text-sm sm:text-base break-words">{fileName}</p>
          </div>

          {/* Warning message */}
          <p className="text-center text-muted-foreground text-xs sm:text-sm leading-relaxed px-2">
            This file requires elevated permissions. Would you like to request 
            one-time access from an administrator?
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="flex-1 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2 text-sm"
              onClick={handleRequestAccess}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Request Access
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
