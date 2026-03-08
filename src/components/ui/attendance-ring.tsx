import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface AttendanceRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AttendanceRing({ percentage, size = 44, strokeWidth = 4, className }: AttendanceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage > 90) return 'stroke-emerald-400';
    if (percentage >= 75) return 'stroke-amber-400';
    return 'stroke-rose-500';
  };

  const getTextColor = () => {
    if (percentage > 90) return 'text-emerald-400';
    if (percentage >= 75) return 'text-amber-400';
    return 'text-rose-500';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted/30"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {percentage < 75 ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        ) : (
          <span className={cn('text-[10px] font-bold', getTextColor())}>{percentage}%</span>
        )}
      </div>
    </div>
  );
}
