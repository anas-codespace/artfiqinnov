import { motion } from 'framer-motion';

const orbs = [
  { 
    color: 'hsl(var(--primary))', 
    size: 600, 
    x: '10%', 
    y: '20%', 
    duration: 25,
    delay: 0 
  },
  { 
    color: 'hsl(0 84.2% 60.2%)', 
    size: 500, 
    x: '70%', 
    y: '60%', 
    duration: 30,
    delay: 5 
  },
  { 
    color: 'hsl(var(--primary))', 
    size: 400, 
    x: '50%', 
    y: '80%', 
    duration: 20,
    delay: 10 
  },
  { 
    color: 'hsl(217 91% 60%)', 
    size: 350, 
    x: '85%', 
    y: '15%', 
    duration: 35,
    delay: 3 
  },
];

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {orbs.map((orb, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full blur-[120px] opacity-20"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            left: orb.x,
            top: orb.y,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            x: [0, 100, -50, 80, 0],
            y: [0, -80, 60, -40, 0],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
