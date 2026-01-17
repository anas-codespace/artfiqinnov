import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { ProfileSettings } from '@/components/ProfileSettings';
import { RoleBadge } from '@/components/ui/role-badge';
import { useUserRole } from '@/hooks/useUserRole';
import artfiqLogo from '@/assets/artfiq-logo.jpeg';

interface TopHeaderProps {
  onNavigate: (tab: string) => void;
}

export function TopHeader({ onNavigate }: TopHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const { role } = useUserRole();
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const defaultAvatar = new URL('@/assets/default-avatar.webp', import.meta.url).href;
  const avatarUrl = profile?.avatar_url || defaultAvatar;

  return (
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-6 bg-background/60 backdrop-blur-xl border-b border-border/30"
      >
        {/* Logo - Left Side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-3"
        >
          {/* Logo Badge Container with Navy Blue styling and white glow */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-card/60 backdrop-blur-md border border-border/50 shadow-lg overflow-hidden drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]">
            <img 
              src={artfiqLogo} 
              alt="ARTFIQ Logo" 
              className="w-full h-full object-cover"
              style={{
                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.9))',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  '0 0 0px rgba(255,255,255,0)',
                  '0 0 12px rgba(255,255,255,0.5)',
                  '0 0 0px rgba(255,255,255,0)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          {/* Brand Text - Using theme colors */}
          <h1 
            className="text-lg font-bold tracking-wider hidden sm:block text-primary"
            style={{
              fontFamily: "'Orbitron', 'Syncopate', sans-serif",
            }}
          >
            ARTFIQ INNOVATIONS
          </h1>
        </motion.div>

        {/* Right Side - Profile & Actions */}
        {user && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <NotificationBell onNavigate={onNavigate} />
            
            {/* Role Badge */}
            <RoleBadge role={role} size="sm" />
            
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 rounded-full pl-3 pr-1 py-1 transition-all"
              onClick={() => setShowProfileSettings(true)}
            >
              <span className="text-sm font-medium hidden sm:block">{displayName}</span>
              <motion.img
                src={avatarUrl}
                alt={displayName}
                className="w-9 h-9 rounded-full border-2 border-primary/30"
                whileHover={{ scale: 1.05, borderColor: 'hsl(var(--primary))' }}
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive rounded-full"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </motion.header>

      {/* Profile Settings Modal */}
      <ProfileSettings 
        open={showProfileSettings} 
        onOpenChange={setShowProfileSettings} 
      />
    </>
  );
}
