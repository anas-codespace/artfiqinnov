import { motion } from 'framer-motion';
import { Home, FolderLock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomDockProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'vault', label: 'Vault', icon: FolderLock },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

export function BottomDock({ activeTab, onTabChange }: BottomDockProps) {
  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-card/60 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/50">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 400, damping: 25 }}
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative flex flex-col items-center justify-center px-5 py-2 rounded-full transition-all duration-300",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active glow effect */}
              {isActive && (
                <motion.div
                  layoutId="dock-active-glow"
                  className="absolute inset-0 rounded-full bg-primary/10 border border-primary/30"
                  style={{
                    boxShadow: '0 0 20px hsl(var(--primary) / 0.3), inset 0 0 10px hsl(var(--primary) / 0.1)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              
              <Icon className={cn("w-5 h-5 relative z-10", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
              <span className="text-[10px] font-medium mt-1 relative z-10">{item.label}</span>
              
              {/* Active dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="dock-active-dot"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                  style={{ boxShadow: '0 0 6px hsl(var(--primary))' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
