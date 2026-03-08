import { motion, AnimatePresence } from 'framer-motion';
import { Home, LayoutGrid, Calendar, FolderLock, MessageSquare, BarChart3, Lightbulb, Activity, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { useChatInput } from '@/contexts/ChatInputContext';

interface BottomDockProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'performance', label: 'Perf', icon: BarChart3 },
  { id: 'vault', label: 'Vault', icon: FolderLock },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'analytics', label: 'Insights', icon: Activity },
  { id: 'innovation', label: 'Lab', icon: Lightbulb },
];

export function BottomDock({ activeTab, onTabChange }: BottomDockProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; itemId: string }[]>([]);
  const chatInput = useChatInput();
  const inputRef = useRef<HTMLInputElement>(null);
  const isOnChat = activeTab === 'chat';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, itemId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    
    setRipples(prev => [...prev, { id, x, y, itemId }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);

    onTabChange(itemId);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatInput.onSend();
    }
  };

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] flex flex-col gap-1.5 bg-card/95 backdrop-blur-xl border-t border-border/50 pt-2 px-2",
        isOnChat && chatInput.isChatFocused
          ? "shadow-[0_-4px_30px_hsl(var(--primary)/0.15)]"
          : "shadow-2xl shadow-black/50"
      )}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0.5rem), 0.5rem)' }}
    >
      {/* Top Tier: Chat Input (only on chat tab) */}
      <AnimatePresence>
        {isOnChat && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "w-full flex items-center bg-secondary/80 rounded-[1.5rem] border pr-2 pl-4 py-1.5 transition-colors",
              chatInput.isChatFocused
                ? "border-primary/60 shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
                : "border-border/50"
            )}>
              {/* Reply indicator */}
              {chatInput.replyTo && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mr-2"
                  style={{ boxShadow: '0 0 6px hsl(var(--primary))' }}
                />
              )}

              <input
                ref={inputRef}
                type="text"
                value={chatInput.newMessage}
                onChange={(e) => {
                  chatInput.setNewMessage(e.target.value);
                  chatInput.onTyping();
                }}
                onKeyDown={handleInputKeyDown}
                onFocus={() => chatInput.setIsChatFocused(true)}
                onBlur={() => chatInput.setIsChatFocused(false)}
                placeholder={chatInput.replyTo ? `Reply to ${chatInput.replyTo.user_name}...` : "Type a message..."}
                disabled={chatInput.isSending}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground text-sm placeholder:text-muted-foreground/50"
              />

              <motion.button
                onClick={chatInput.onSend}
                disabled={!chatInput.newMessage.trim() || chatInput.isSending}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                  chatInput.newMessage.trim()
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Tier: All 8 Navigation Icons */}
      <div className="w-full flex justify-between items-center px-1 pb-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const itemRipples = ripples.filter(r => r.itemId === item.id);

          return (
            <motion.button
              key={item.id}
              onClick={(e) => handleClick(e, item.id)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-full transition-all duration-300 overflow-hidden px-1.5 py-1 min-w-0 flex-1",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Ripple effects */}
              {itemRipples.map(ripple => (
                <motion.span
                  key={ripple.id}
                  className="absolute rounded-full bg-primary/30 pointer-events-none"
                  style={{ left: ripple.x, top: ripple.y, transform: 'translate(-50%, -50%)' }}
                  initial={{ width: 0, height: 0, opacity: 0.6 }}
                  animate={{ width: 80, height: 80, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              ))}

              {/* Active glow */}
              {isActive && (
                <motion.div
                  layoutId="dock-active-glow"
                  className="absolute inset-0 rounded-full bg-primary/10"
                  style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.25)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              
              <Icon className={cn(
                "relative z-10 w-4 h-4 flex-shrink-0",
                isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]"
              )} />
              <span className="text-[9px] font-medium relative z-10 whitespace-nowrap leading-tight">
                {item.label}
              </span>
              
              {/* Active dot */}
              {isActive && (
                <motion.div
                  layoutId="dock-active-dot"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
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
