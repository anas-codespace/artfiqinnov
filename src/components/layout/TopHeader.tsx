import { motion } from 'framer-motion';
import { LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { ProfileSettings } from '@/components/ProfileSettings';
import { RoleBadge } from '@/components/ui/role-badge';
import { useUserRole } from '@/hooks/useUserRole';
import artfiqLogo from '@/assets/artfiq-logo.png';

interface TopHeaderProps {
  onNavigate: (tab: string) => void;
}

export function TopHeader({ onNavigate }: TopHeaderProps) {
  const { user, profile, signOut, isGuest } = useAuth();
  const { displayRole, isFounder } = useUserRole();
  const navigate = useNavigate();
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
        className="fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 bg-background/60 backdrop-blur-xl border-b border-border/30"
      >
        {/* Logo - Left Side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-2 sm:gap-3 min-w-0"
        >
          {/* Logo Badge Container with Navy Blue styling and white glow */}
          <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card/60 backdrop-blur-md border border-border/50 shadow-lg overflow-hidden drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]">
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
            className="text-sm sm:text-lg font-bold tracking-wider hidden xs:block text-primary truncate max-w-[120px] sm:max-w-none"
            style={{
              fontFamily: "'Orbitron', 'Syncopate', sans-serif",
            }}
          >
            <span className="hidden sm:inline">ARTFIQ INNOVATIONS</span>
            <span className="sm:hidden">ARTFIQ</span>
          </h1>
        </motion.div>

        {/* Right Side - Profile & Actions */}
        {user && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-1 sm:gap-3"
          >
            {/* Notification Bell - Hidden for guests */}
            {!isGuest && (
              <NotificationBell 
                onNavigate={onNavigate} 
                onOpenAdmin={() => navigate('/admin-console')}
              />
            )}
            
            {/* Admin Dashboard Button - Only for Founders, hidden for guests */}
            {!isGuest && isFounder && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin-console')}
                className="text-primary hover:text-primary hover:bg-primary/10 rounded-full w-8 h-8 sm:w-10 sm:h-10"
                title="Command Center"
              >
                <Shield className="w-4 h-4" />
              </Button>
            )}
            
            {/* Role Badge - Hidden for guests */}
            {!isGuest && (
              <div className="hidden xs:block">
                <RoleBadge role={displayRole} size="sm" />
              </div>
            )}
            
            {/* Profile area - non-clickable for guests */}
            <div 
              className={cn(
                "flex items-center gap-1 sm:gap-3 rounded-full pl-2 sm:pl-3 pr-1 py-1 transition-all",
                isGuest ? "" : "cursor-pointer hover:bg-secondary/50"
              )}
              onClick={isGuest ? undefined : () => setShowProfileSettings(true)}
            >
              <span className="text-xs sm:text-sm font-medium hidden md:block truncate max-w-[100px]">
                {displayName}
              </span>
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-border/30 flex-shrink-0"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive rounded-full w-8 h-8 sm:w-10 sm:h-10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </motion.header>

      {/* Profile Settings Modal - Hidden for guests */}
      {!isGuest && (
        <ProfileSettings 
          open={showProfileSettings} 
          onOpenChange={setShowProfileSettings} 
        />
      )}
    </>
  );
}
