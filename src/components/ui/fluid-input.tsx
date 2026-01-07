import { motion } from 'framer-motion';
import { InputHTMLAttributes, useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface FluidInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const FluidInput = forwardRef<HTMLInputElement, FluidInputProps>(
  ({ label, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="relative">
        {label && (
          <motion.label
            className="absolute left-4 text-muted-foreground pointer-events-none z-10"
            initial={false}
            animate={{
              top: isFocused || props.value ? 6 : '50%',
              fontSize: isFocused || props.value ? '10px' : '14px',
              y: isFocused || props.value ? 0 : '-50%',
              color: isFocused ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            }}
            transition={{
              duration: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {label}
          </motion.label>
        )}
        
        <motion.div
          className="relative"
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
          }}
        >
          <input
            ref={ref}
            className={cn(
              'w-full bg-secondary/50 rounded-xl border-2 border-border/50',
              'px-4 py-3 text-foreground placeholder:text-muted-foreground/50',
              'transition-colors duration-300',
              'focus:outline-none focus:border-primary/50 focus:bg-secondary/70',
              label && 'pt-6 pb-2',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          
          {/* Morphing border highlight */}
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              border: '2px solid transparent',
              background: isFocused 
                ? 'linear-gradient(hsl(var(--secondary)), hsl(var(--secondary))) padding-box, linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.3)) border-box'
                : 'none',
            }}
            initial={false}
            animate={{
              opacity: isFocused ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </div>
    );
  }
);

FluidInput.displayName = 'FluidInput';
