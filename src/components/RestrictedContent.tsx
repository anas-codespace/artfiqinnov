import { motion } from 'framer-motion';
import { Lock, Shield, ShieldAlert, FileWarning, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserStatus } from '@/hooks/useUserStatus';
import { springPresets } from '@/components/ui/spring-config';

interface RestrictedContentProps {
  type: 'chat' | 'timeline' | 'vault' | 'tasks';
  title?: string;
  description?: string;
  onRequestAccess?: () => void;
}

const contentConfig = {
  chat: {
    icon: Lock,
    title: 'Encrypted Team Communications',
    description: 'Security clearance required. Please request access to view encrypted team comms.',
    color: 'primary',
  },
  timeline: {
    icon: Eye,
    title: 'Future Operations Classified',
    description: 'Viewing access to future events requires team membership.',
    color: 'destructive',
  },
  vault: {
    icon: FileWarning,
    title: 'Restricted Document',
    description: 'This file requires elevated access permissions.',
    color: 'amber-500',
  },
  tasks: {
    icon: ShieldAlert,
    title: 'Task Details Classified',
    description: 'Full task information is available to team members only.',
    color: 'primary',
  },
};

export function RestrictedContent({ 
  type, 
  title, 
  description, 
  onRequestAccess 
}: RestrictedContentProps) {
  const { isVisitor, isPending, requestAccess } = useUserStatus();
  const config = contentConfig[type];
  const Icon = config.icon;

  const handleRequest = async () => {
    if (onRequestAccess) {
      onRequestAccess();
    } else {
      await requestAccess();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springPresets.snappy}
      className="flex items-center justify-center min-h-[400px] p-6"
    >
      <div className="relative max-w-md w-full">
        {/* Glassmorphism card */}
        <div className="relative backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl p-8 shadow-2xl">
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-destructive/10 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10 text-center space-y-6">
            {/* Icon with animated ring */}
            <div className="relative inline-flex">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.2, 0.5],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <div className="relative w-20 h-20 rounded-full bg-card border-2 border-primary/50 flex items-center justify-center">
                <Icon className="w-10 h-10 text-primary" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold">
              {title || config.title}
            </h3>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {description || config.description}
            </p>

            {/* Action button */}
            {isVisitor && (
              <Button 
                onClick={handleRequest}
                className="w-full gap-2"
              >
                <Shield className="w-4 h-4" />
                Request Access
              </Button>
            )}

            {isPending && (
              <div className="flex items-center justify-center gap-2 text-amber-500">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Lock className="w-4 h-4" />
                </motion.div>
                <span className="text-sm">Access request pending approval...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
