import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, MessageSquare, FileText, Check, UserPlus, UserX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  // For access_request notifications, we extract the requester info from message
}

interface NotificationBellProps {
  onNavigate?: (tab: string) => void;
  onOpenAdmin?: () => void;
}

export function NotificationBell({ onNavigate, onOpenAdmin }: NotificationBellProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    };

    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-primary" />;
      case 'file':
        return <FileText className="w-4 h-4 text-primary/70" />;
      case 'access_request':
        return <UserPlus className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Extract requester email from the notification message
  const extractRequesterEmail = (message: string): string | null => {
    // Message format: "John (john@example.com) is requesting team access."
    const emailMatch = message.match(/\(([^)]+@[^)]+)\)/);
    return emailMatch ? emailMatch[1] : null;
  };

  // Handle approve/decline access request
  const handleAccessAction = async (
    notification: Notification,
    action: 'approve' | 'decline',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    
    const requesterEmail = extractRequesterEmail(notification.message);
    if (!requesterEmail) {
      toast({
        title: 'Error',
        description: 'Could not find requester information',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(notification.id);

    // Find the user by email
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', requesterEmail)
      .single();

    if (!requesterProfile) {
      toast({
        title: 'Error',
        description: 'User not found',
        variant: 'destructive',
      });
      setActionLoading(null);
      return;
    }

    const newStatus = action === 'approve' ? 'approved_member' : 'visitor';
    
    const { error } = await supabase
      .from('profiles')
      .update({ access_status: newStatus })
      .eq('user_id', requesterProfile.user_id);

    if (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} request`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: action === 'approve' ? 'Approved!' : 'Declined',
        description: action === 'approve' 
          ? 'User has been granted team access' 
          : 'Access request declined',
      });
      
      // Mark notification as read
      await markAsRead(notification.id);
    }

    setActionLoading(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed right-3 sm:right-6 top-14 sm:top-16 mt-1 w-80 max-w-[calc(100vw-1.5rem)] bg-card border border-border/50 rounded-2xl shadow-2xl z-[100] overflow-hidden origin-top-right"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "p-3 border-b border-border/50 hover:bg-secondary/50 transition-colors",
                        !notification.read && "bg-primary/5",
                        notification.type !== 'access_request' && "cursor-pointer"
                      )}
                      onClick={() => {
                        if (notification.type === 'access_request') return;
                        markAsRead(notification.id);
                        if (notification.link && onNavigate) {
                          onNavigate(notification.link);
                        }
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                          
                          {/* Action buttons for access requests */}
                          {notification.type === 'access_request' && !notification.read && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="default"
                                disabled={actionLoading === notification.id}
                                onClick={(e) => handleAccessAction(notification, 'approve', e)}
                                className="h-7 px-2 text-xs gap-1"
                              >
                                {actionLoading === notification.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={actionLoading === notification.id}
                                onClick={(e) => handleAccessAction(notification, 'decline', e)}
                                className="h-7 px-2 text-xs gap-1"
                              >
                                <UserX className="w-3 h-3" />
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                        {!notification.read && notification.type !== 'access_request' && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
