import { motion } from 'framer-motion';
import { Home, FolderLock, MessageSquare, LogOut, Menu, X, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { ProfileSettings } from '@/components/ProfileSettings';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'home', label: 'About', icon: Home },
  { id: 'vault', label: 'Vault', icon: FolderLock },
  { id: 'chat', label: 'Team Chat', icon: MessageSquare },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, profile, signOut } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`;

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border h-16 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-gradient-cyber">ARTFIQ</h1>
        <div className="flex items-center gap-2">
          <NotificationBell onNavigate={onTabChange} />
          {user && (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full border border-primary/50 cursor-pointer"
              onClick={() => setShowProfileSettings(true)}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          "fixed lg:static z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo + Notifications */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-gradient-cyber">ARTFIQ</h1>
          <div className="hidden lg:block">
            <NotificationBell onNavigate={onTabChange} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-t border-sidebar-border">
            <div 
              className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-secondary/50 rounded-lg p-2 -m-2 transition-colors"
              onClick={() => setShowProfileSettings(true)}
            >
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full border-2 border-primary/30"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border h-16 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettings 
        open={showProfileSettings} 
        onOpenChange={setShowProfileSettings} 
      />
    </>
  );
}
