import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface SoftFloatProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
}

export function SoftFloat({ 
  children, 
  delay = 0, 
  duration = 0.8,
  y = 40,
  className = '',
  ...props 
}: SoftFloatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for balloon-like rising
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ 
  children, 
  className = '',
  staggerDelay = 0.1 
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
