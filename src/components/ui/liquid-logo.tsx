import { motion } from 'framer-motion';
import artfiqLogo from '@/assets/artfiq-logo.png';

interface LiquidLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function LiquidLogo({ size = 120, className = '', animate = true }: LiquidLogoProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        animate={animate ? {
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Logo container with liquid fill effect */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden">
        {/* Base outline (visible first) */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/30"
          initial={animate ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        
        {/* Liquid fill mask */}
        <motion.div
          className="absolute inset-0 overflow-hidden rounded-2xl"
          initial={animate ? { clipPath: 'inset(100% 0 0 0)' } : { clipPath: 'inset(0 0 0 0)' }}
          animate={{ clipPath: 'inset(0 0 0 0)' }}
          transition={{
            duration: 1.5,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.3,
          }}
        >
          <img
            src={artfiqLogo}
            alt="ARTFIQ"
            className="w-full h-full object-cover"
          />
          
          {/* Liquid wave overlay */}
          <motion.div
            className="absolute inset-x-0 h-8 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, hsl(var(--primary) / 0.3) 0%, transparent 100%)',
            }}
            initial={animate ? { top: '100%' } : { top: '-100%' }}
            animate={{ top: '-100%' }}
            transition={{
              duration: 1.5,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.3,
            }}
          />
        </motion.div>

        {/* Breathing border effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/50"
          animate={animate ? {
            borderColor: [
              'hsl(var(--primary) / 0.3)',
              'hsl(var(--primary) / 0.6)',
              'hsl(var(--primary) / 0.3)',
            ],
          } : {}}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </div>
  );
}
