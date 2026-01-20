import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Loader2, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useAccessWarning } from '@/contexts/AccessWarningContext';
import { useToast } from '@/hooks/use-toast';

export function AccessWarningToast() {
  const { isVisitor, isPending, isMember, isAdmin, requestAccess } = useUserStatus();
  const { isVisible, hideWarning } = useAccessWarning();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);

  // Don't render for approved members or admins
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
      hideWarning();
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
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.95 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 30,
            mass: 0.8
          }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg"
        >
          {/* Glassmorphism Toast Container */}
          <div className="relative bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 backdrop-blur-xl border border-amber-400/30 rounded-2xl shadow-2xl shadow-amber-500/20 overflow-hidden">
            {/* Animated glow border */}
            <motion.div 
              className="absolute inset-0 rounded-2xl opacity-50"
              animate={{
                boxShadow: [
                  '0 0 20px hsl(38 92% 50% / 0.3)',
                  '0 0 40px hsl(38 92% 50% / 0.5)',
                  '0 0 20px hsl(38 92% 50% / 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="relative px-5 py-4 flex items-center justify-between gap-4">
              {/* Icon and Text */}
              <div className="flex items-center gap-3 flex-1">
                {isPending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="flex-shrink-0"
                  >
                    <Clock className="w-6 h-6 text-amber-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex-shrink-0"
                  >
                    <ShieldAlert className="w-6 h-6 text-amber-400" />
                  </motion.div>
                )}
                <div>
                  <p className="font-semibold text-amber-100">
                    {isPending ? 'Access Request Pending' : 'Guest Mode Active'}
                  </p>
                  <p className="text-sm text-amber-200/80">
                    {isPending
                      ? 'Awaiting founder approval'
                      : 'Request access to unlock all features'}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2">
                {isVisitor && (
                  <Button
                    onClick={handleRequestAccess}
                    disabled={isRequesting}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-amber-950 border-none shadow-lg gap-2 font-semibold"
                  >
                    {isRequesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Requesting...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span className="hidden sm:inline">Request Access</span>
                      </>
                    )}
                  </Button>
                )}

                {isPending && (
                  <div className="flex items-center gap-2 text-amber-200 bg-amber-900/30 px-3 py-1.5 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium hidden sm:inline">Pending...</span>
                  </div>
                )}

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={hideWarning}
                  className="h-8 w-8 text-amber-300 hover:text-amber-100 hover:bg-amber-500/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400"
              initial={{ scaleX: 1, originX: 0 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 10, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
