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
          className="fixed top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-[100] sm:w-[90%] sm:max-w-lg"
        >
          {/* Glassmorphism Toast Container */}
          <div className="relative bg-gradient-to-r from-warning/20 via-warning/15 to-warning/20 backdrop-blur-xl border border-warning/30 rounded-2xl shadow-2xl overflow-hidden">
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

            {/* Mobile-first responsive layout */}
            <div className="relative px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Icon and Text */}
              <div className="flex items-start sm:items-center gap-3 flex-1">
                {isPending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="flex-shrink-0 mt-0.5 sm:mt-0"
                  >
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex-shrink-0 mt-0.5 sm:mt-0"
                  >
                    <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                  </motion.div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base text-warning-foreground whitespace-normal break-words">
                    {isPending ? 'Access Request Pending' : 'Guest Mode Active'}
                  </p>
                  <p className="text-xs sm:text-sm text-warning-foreground/80 whitespace-normal break-words">
                    {isPending
                      ? 'Awaiting founder approval'
                      : 'Request access to unlock all features'}
                  </p>
                </div>
              </div>

              {/* Action Button Row */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                {isVisitor && (
                  <Button
                    onClick={handleRequestAccess}
                    disabled={isRequesting}
                    size="sm"
                    className="flex-1 sm:flex-none bg-warning hover:bg-warning/90 text-warning-foreground border-none shadow-lg gap-2 font-semibold text-xs sm:text-sm"
                  >
                    {isRequesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Requesting...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Request Access</span>
                      </>
                    )}
                  </Button>
                )}

                {isPending && (
                  <div className="flex items-center gap-2 text-warning-foreground bg-warning/20 px-3 py-1.5 rounded-lg flex-1 sm:flex-none justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs sm:text-sm font-medium">Pending...</span>
                  </div>
                )}

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={hideWarning}
                  className="h-8 w-8 flex-shrink-0 text-warning-foreground/70 hover:text-warning-foreground hover:bg-warning/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              className="h-1 bg-gradient-to-r from-warning via-warning to-warning"
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
