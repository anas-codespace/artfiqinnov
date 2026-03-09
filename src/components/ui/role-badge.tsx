import { motion, type Transition } from 'framer-motion';
import { Crown, Code2, Users, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DisplayRole = 'ceo' | 'cto' | 'team' | 'visitor';

interface RoleBadgeProps {
  role: DisplayRole | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const springTransition: Transition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

export function RoleBadge({ role, className, size = 'md', showIcon = true }: RoleBadgeProps) {
  if (!role) return null;

  const getConfig = () => {
    switch (role) {
      case 'ceo':
        return {
          label: 'CEO',
          icon: Crown,
          gradient: 'from-amber-500/20 via-yellow-500/20 to-amber-400/20',
          border: 'border-amber-500/50',
          text: 'text-amber-400',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
        };
      case 'cto':
        return {
          label: 'MD',
          icon: Code2,
          gradient: 'from-cyan-500/20 via-blue-500/20 to-cyan-400/20',
          border: 'border-cyan-500/50',
          text: 'text-cyan-400',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
        };
      case 'team':
        return {
          label: 'Team Member',
          icon: Users,
          gradient: 'from-emerald-500/20 via-green-500/20 to-emerald-400/20',
          border: 'border-emerald-500/50',
          text: 'text-emerald-400',
          glow: '',
        };
      case 'visitor':
        return {
          label: 'Visitor',
          icon: Eye,
          gradient: 'from-muted/40 via-muted/20 to-muted/40',
          border: 'border-border/50',
          text: 'text-muted-foreground',
          glow: '',
        };
      default:
        return null;
    }
  };

  const config = getConfig();
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springTransition}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider',
        'bg-gradient-to-r backdrop-blur-md border',
        config.gradient,
        config.border,
        config.text,
        config.glow,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </motion.div>
  );
}
