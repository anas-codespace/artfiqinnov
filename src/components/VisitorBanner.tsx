import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useToast } from '@/hooks/use-toast';

export function VisitorBanner() {
  const { isVisitor, isPending, isMember, isAdmin, requestAccess } = useUserStatus();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);

  // Don't show banner for approved members or admins
  if (isMember || isAdmin) return null;

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    const success = await requestAccess();
    setIsRequesting(false);

    if (success) {
      toast({
        title: 'Access Requested',
        description: 'The founders have been notified. You will be contacted soon.',
      });
    } else {
      toast({
        title: 'Request Failed',
        description: 'Could not send access request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-500/90 backdrop-blur-md border-b border-amber-400/30 shadow-lg shadow-amber-500/20"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isPending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Clock className="w-5 h-5 text-amber-900" />
              </motion.div>
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-900" />
            )}
            <div>
              <p className="font-semibold text-amber-950">
                {isPending ? 'Access Request Pending' : 'Guest Mode Active'}
              </p>
              <p className="text-sm text-amber-800">
                {isPending
                  ? 'Awaiting founder approval. Limited access until then.'
                  : 'Limited access. Request team membership to unlock all features.'}
              </p>
            </div>
          </div>

          {isVisitor && (
            <Button
              onClick={handleRequestAccess}
              disabled={isRequesting}
              className="bg-amber-900 hover:bg-amber-950 text-white border-none shadow-lg gap-2"
            >
              {isRequesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Request Team Access
                </>
              )}
            </Button>
          )}

          {isPending && (
            <div className="flex items-center gap-2 text-amber-900 bg-amber-200/50 px-4 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Request Pending...</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
