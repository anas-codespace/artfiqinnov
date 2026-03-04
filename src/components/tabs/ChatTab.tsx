import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Reply, X, CheckCheck, Check, Info, Bell, Trash2, MoreVertical, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SoftFloat } from '@/components/ui/soft-float';
import { RoleBadge } from '@/components/ui/role-badge';
import { MessageInfoModal } from '@/components/ui/message-info-modal';
import { springPresets } from '@/components/ui/spring-config';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserStatus } from '@/hooks/useUserStatus';
import { RestrictedContent } from '@/components/RestrictedContent';
import { useAccessWarning } from '@/contexts/AccessWarningContext';
import { useChatInput } from '@/contexts/ChatInputContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import artfiqLogo from '@/assets/artfiq-logo.jpeg';
import defaultAvatarImg from '@/assets/default-avatar.webp';

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  text: string;
  reply_to: string | null;
  created_at: string;
  reactions?: Reaction[];
  reply_message?: Message | null;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface MessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  isOnline: boolean;
  isTyping: boolean;
  role?: 'ceo' | 'cto' | 'team' | null;
}

interface UserPresence {
  user_id: string;
  is_online: boolean;
  is_typing: boolean;
  last_seen: string;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatTab() {
  const { user, profile } = useAuth();
  const { role, isFounder } = useUserRole();
  const { isMember, isAdmin, isLoading: statusLoading } = useUserStatus();
  const { showWarning } = useAccessWarning();
  const chatInput = useChatInput();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [messageReads, setMessageReads] = useState<Record<string, MessageRead[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [presenceData, setPresenceData] = useState<Record<string, UserPresence>>({});
  const [cleanupCount, setCleanupCount] = useState<number | null>(null);
  const [selectedMessageForInfo, setSelectedMessageForInfo] = useState<Message | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-delete messages older than 72 hours (only founders can trigger)
  const cleanupOldMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_messages');
      if (error) {
        // Silently ignore access denied errors for non-founders
        // The function now requires CEO/CTO role
        if (!error.message?.includes('Access denied')) {
          console.error('Error cleaning up old messages:', error);
        }
      } else if (data && data > 0) {
        setCleanupCount(data);
        toast({
          title: 'Old messages cleaned up',
          description: `${data} message(s) older than 72 hours were removed.`,
        });
        // Remove old messages from local state
        const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000);
        setMessages(prev => prev.filter(m => new Date(m.created_at) > cutoffTime));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, [toast]);

  // Run cleanup on mount
  useEffect(() => {
    cleanupOldMessages();
  }, [cleanupOldMessages]);

  // Mark message as read
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user) return;
    
    // Check if already marked as read
    const existingRead = messageReads[messageId]?.find(r => r.user_id === user.id);
    if (existingRead) return;
    
    try {
      await supabase.from('message_reads').upsert({
        message_id: messageId,
        user_id: user.id,
      }, { onConflict: 'message_id,user_id' });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [user, messageReads]);

  // Update presence
  const updatePresence = useCallback(async (isTyping: boolean = false) => {
    if (!user) return;
    
    try {
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        is_online: true,
        is_typing: isTyping,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user]);

  // Set up intersection observer for read receipts
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              markMessageAsRead(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [markMessageAsRead]);

  // Fetch participants and presence with roles
  useEffect(() => {
    const fetchParticipants = async () => {
      // Use profiles_safe view instead of profiles table to protect email privacy
      const { data: profiles } = await supabase
        .from('profiles_safe')
        .select('id, user_id, display_name, avatar_url')
        .order('created_at', { ascending: true });

      const { data: presence } = await supabase
        .from('user_presence')
        .select('*');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const presenceMap: Record<string, UserPresence> = {};
      presence?.forEach(p => {
        presenceMap[p.user_id] = p;
      });
      setPresenceData(presenceMap);

      const rolesMap: Record<string, 'ceo' | 'cto' | 'team'> = {};
      roles?.forEach(r => {
        rolesMap[r.user_id] = r.role as 'ceo' | 'cto' | 'team';
      });

      if (profiles) {
        setParticipants(profiles.map(p => ({
          ...p,
          isOnline: presenceMap[p.user_id]?.is_online ?? false,
          isTyping: presenceMap[p.user_id]?.is_typing ?? false,
          role: rolesMap[p.user_id] || 'team',
        })));
      }
    };

    fetchParticipants();
    
    // Update own presence on mount
    updatePresence(false);

    // Set offline on unmount
    return () => {
      if (user) {
        supabase.from('user_presence').update({
          is_online: false,
          is_typing: false,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
      }
    };
  }, [user, updatePresence]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      } else {
        const messageMap = new Map(messagesData?.map(m => [m.id, m]) || []);
        const messagesWithReplies = messagesData?.map(m => ({
          ...m,
          reply_message: m.reply_to ? messageMap.get(m.reply_to) || null : null
        })) || [];
        setMessages(messagesWithReplies);
      }

      // Fetch reactions
      const { data: reactionsData } = await supabase
        .from('message_reactions')
        .select('*');

      if (reactionsData) {
        const groupedReactions: Record<string, Reaction[]> = {};
        reactionsData.forEach((r) => {
          if (!groupedReactions[r.message_id]) {
            groupedReactions[r.message_id] = [];
          }
          groupedReactions[r.message_id].push(r);
        });
        setReactions(groupedReactions);
      }

      // Fetch read receipts
      const { data: readsData } = await supabase
        .from('message_reads')
        .select('*');

      if (readsData) {
        const groupedReads: Record<string, MessageRead[]> = {};
        readsData.forEach((r) => {
          if (!groupedReads[r.message_id]) {
            groupedReads[r.message_id] = [];
          }
          groupedReads[r.message_id].push(r);
        });
        setMessageReads(groupedReads);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    const messagesChannel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            const replyMessage = newMsg.reply_to 
              ? prev.find(m => m.id === newMsg.reply_to) || null 
              : null;
            return [...prev, { ...newMsg, reply_message: replyMessage }];
          });
          
          // Show toast for new messages from others
          if (newMsg.user_id !== user?.id) {
            toast({
              title: newMsg.user_name,
              description: newMsg.text.slice(0, 50) + (newMsg.text.length > 50 ? '...' : ''),
            });
          }
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel('reactions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new as Reaction;
            setReactions((prev) => ({
              ...prev,
              [newReaction.message_id]: [
                ...(prev[newReaction.message_id] || []),
                newReaction,
              ],
            }));
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old as Reaction;
            setReactions((prev) => ({
              ...prev,
              [oldReaction.message_id]: (prev[oldReaction.message_id] || []).filter(
                (r) => r.id !== oldReaction.id
              ),
            }));
          }
        }
      )
      .subscribe();

    // Real-time read receipts
    const readsChannel = supabase
      .channel('reads-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (payload) => {
          const newRead = payload.new as MessageRead;
          setMessageReads((prev) => ({
            ...prev,
            [newRead.message_id]: [
              ...(prev[newRead.message_id] || []),
              newRead,
            ],
          }));
        }
      )
      .subscribe();

    // Real-time presence
    const presenceChannel = supabase
      .channel('presence-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const presence = payload.new as UserPresence;
            setPresenceData((prev) => ({
              ...prev,
              [presence.user_id]: presence,
            }));

            // Update typing users
            if (presence.is_typing && presence.user_id !== user?.id) {
              const participant = participants.find(p => p.user_id === presence.user_id);
              if (participant) {
                setTypingUsers(prev => {
                  const name = participant.display_name || 'Someone';
                  if (!prev.includes(name)) return [...prev, name];
                  return prev;
                });
              }
            } else if (!presence.is_typing) {
              const participant = participants.find(p => p.user_id === presence.user_id);
              if (participant) {
                setTypingUsers(prev => prev.filter(n => n !== (participant.display_name || 'Someone')));
              }
            }

            // Update participant online status
            setParticipants(prev => prev.map(p => 
              p.user_id === presence.user_id 
                ? { ...p, isOnline: presence.is_online, isTyping: presence.is_typing }
                : p
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(readsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id, participants, toast]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing indicator
  const handleTyping = () => {
    updatePresence(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      updatePresence(false);
    }, 2000);
  };

  const MAX_MESSAGE_LENGTH = 5000;

  const handleSend = useCallback(async () => {
    if (!chatInput.newMessage.trim() || !user) return;

    const messageText = chatInput.newMessage.trim();

    if (messageText.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: 'Message too long',
        description: `Please keep messages under ${MAX_MESSAGE_LENGTH} characters.`,
        variant: 'destructive',
      });
      return;
    }

    chatInput.setIsSending(true);
    updatePresence(false);
    
    chatInput.setNewMessage('');
    const replyToId = chatInput.replyTo?.id || null;
    chatInput.setReplyTo(null);

    try {
      const { error } = await supabase.from('messages').insert({
        user_id: user.id,
        user_name: (profile?.display_name || user.email?.split('@')[0] || 'Unknown').slice(0, 100),
        user_avatar: profile?.avatar_url || defaultAvatarImg,
        text: messageText,
        reply_to: replyToId,
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Failed to send message',
        description: 'Unable to send your message. Please try again.',
        variant: 'destructive',
      });
      chatInput.setNewMessage(messageText);
    }

    chatInput.setIsSending(false);
  }, [chatInput, user, profile, toast, updatePresence]);

  // Register send and typing handlers for the dock input
  useEffect(() => {
    chatInput.registerSendHandler(handleSend);
  }, [handleSend, chatInput]);

  useEffect(() => {
    chatInput.registerTypingHandler(handleTyping);
  }, [handleTyping, chatInput]);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const existingReaction = reactions[messageId]?.find(
      (r) => r.user_id === user.id && r.emoji === emoji
    );

    if (existingReaction) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }

    setShowEmojiPicker(null);
  };

  // Delete message (only sender can delete their own message)
  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      toast({
        title: 'Failed to delete message',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast({ title: 'Message deleted' });
    }
  };

  // Notify Founders
  const handleNotifyFounders = async () => {
    if (!user || !profile) return;

    const { error } = await supabase.from('founder_alerts').insert({
      type: 'chat',
      message: 'Urgent attention needed in team chat!',
      triggered_by: user.id,
      triggered_by_name: profile.display_name || user.email?.split('@')[0] || 'Unknown',
    });

    if (error) {
      toast({
        title: 'Failed to notify founders',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: '🔔 Founders notified!',
        description: 'CEO and CTO have been alerted.',
      });
    }
  };




  const getReactionCounts = (messageId: string) => {
    const messageReactions = reactions[messageId] || [];
    const counts: Record<string, { count: number; hasUserReacted: boolean }> = {};

    messageReactions.forEach((r) => {
      if (!counts[r.emoji]) {
        counts[r.emoji] = { count: 0, hasUserReacted: false };
      }
      counts[r.emoji].count++;
      if (r.user_id === user?.id) {
        counts[r.emoji].hasUserReacted = true;
      }
    });

    return counts;
  };

  const getReadStatus = (message: Message) => {
    if (message.user_id !== user?.id) return null;
    
    const reads = messageReads[message.id] || [];
    const otherReads = reads.filter(r => r.user_id !== user?.id);
    const totalOthers = participants.filter(p => p.user_id !== user?.id).length;
    
    if (otherReads.length === 0) {
      return { status: 'sent', count: 0 };
    } else if (otherReads.length >= totalOthers) {
      return { status: 'read_all', count: otherReads.length };
    } else {
      return { status: 'read_some', count: otherReads.length };
    }
  };

  // Long press handlers for message info
  const handleMessageLongPressStart = (message: Message) => {
    if (message.user_id !== user?.id) return; // Only for own messages
    
    const timer = setTimeout(() => {
      setSelectedMessageForInfo(message);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMessageLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Get participant role
  const getParticipantRole = (userId: string): 'ceo' | 'cto' | 'team' | null => {
    const participant = participants.find(p => p.user_id === userId);
    return participant?.role || null;
  };

  const onlineParticipants = participants.filter(p => p.isOnline || presenceData[p.user_id]?.is_online);

  // Show restricted content for non-members
  if (!statusLoading && !isMember && !isAdmin) {
    return <RestrictedContent type="chat" showWarning={showWarning} />;
  }

  // Copy message to clipboard
  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative overflow-hidden max-w-5xl mx-auto">
      {/* Watermark Background */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{
          backgroundImage: `url(${artfiqLogo})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '40%',
          opacity: 0.03,
          filter: 'grayscale(100%)',
        }}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col z-10">
        {/* Header with privacy notice */}
        <SoftFloat delay={0} className="flex-shrink-0 p-4 lg:p-6 border-b border-border bg-background/80 backdrop-blur-xl rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Team Chat</h1>
              <p className="text-sm text-muted-foreground">
                {messages.length} messages • {onlineParticipants.length} online
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Notify Founders Button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={springPresets.button}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNotifyFounders}
                  className="gap-2 border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notify Founders</span>
                </Button>
              </motion.div>
              {/* Online participants avatars with status dot */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {onlineParticipants.slice(0, 5).map((p) => (
                  <motion.div
                    key={p.id}
                    className="relative"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={springPresets.bouncy}
                  >
                    <img
                      src={p.avatar_url || defaultAvatarImg}
                      alt={p.display_name || 'User'}
                      className="w-8 h-8 rounded-full border-2 border-background"
                    />
                    {/* Green online dot */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                  </motion.div>
                ))}
              </div>
              {onlineParticipants.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{onlineParticipants.length - 5} more
                </span>
              )}
              </div>
            </div>
          </div>
          {/* Privacy Notice */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPresets.snappy, delay: 0.5 }}
            className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-full px-3 py-1.5 w-fit"
          >
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Messages are auto-deleted after 3 days for security</span>
          </motion.div>
        </SoftFloat>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 scrollbar-cyber">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <SoftFloat delay={0.2} className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </SoftFloat>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const isOwnMessage = message.user_id === user?.id;
                const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
                const reactionCounts = getReactionCounts(message.id);
                const readStatus = getReadStatus(message);
                const senderRole = getParticipantRole(message.user_id);

                return (
                  <motion.div
                    key={message.id}
                    data-message-id={message.id}
                    ref={(el) => {
                      if (el && !isOwnMessage && observerRef.current) {
                        observerRef.current.observe(el);
                      }
                    }}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={springPresets.snappy}
                    onMouseDown={() => handleMessageLongPressStart(message)}
                    onMouseUp={handleMessageLongPressEnd}
                    onMouseLeave={handleMessageLongPressEnd}
                    onTouchStart={() => handleMessageLongPressStart(message)}
                    onTouchEnd={handleMessageLongPressEnd}
                    className={cn("flex gap-3 group", isOwnMessage && "flex-row-reverse")}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10">
                      {showAvatar && (
                        <motion.img
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={springPresets.bouncy}
                          src={message.user_avatar || defaultAvatarImg}
                          alt={message.user_name}
                          className="w-10 h-10 rounded-full border border-border"
                        />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={cn("max-w-[70%] space-y-1", isOwnMessage && "items-end")}>
                      {showAvatar && (
                        <div className={cn("flex items-center gap-2 text-sm", isOwnMessage && "flex-row-reverse")}>
                          <span className="font-medium">{message.user_name}</span>
                          {senderRole && senderRole !== 'team' && (
                            <RoleBadge role={senderRole} size="sm" showIcon={false} />
                          )}
                          <span className="text-muted-foreground text-xs">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                      )}

                      {/* Reply Preview */}
                      {message.reply_message && (
                        <div className={cn(
                          "text-xs px-3 py-1.5 rounded-lg bg-muted/50 border-l-2 border-primary",
                          isOwnMessage && "ml-auto"
                        )}>
                          <span className="font-medium text-primary">
                            {message.reply_message.user_name}
                          </span>
                          <p className="text-muted-foreground truncate max-w-[200px]">
                            {message.reply_message.text}
                          </p>
                        </div>
                      )}

                      <div className="relative">
                        <DropdownMenu>
                          <motion.div 
                            className={cn(
                              "flex flex-row items-center gap-3 w-fit max-w-[85%] rounded-3xl px-5 py-3",
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "glass-card"
                            )}
                            whileHover={{ scale: 1.01 }}
                            transition={springPresets.button}
                          >
                            {/* Message text */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-relaxed break-words">{message.text}</p>
                              
                              {/* Read receipt for own messages */}
                              {isOwnMessage && readStatus && (
                                <motion.div 
                                  className="flex items-center justify-end gap-1 mt-1"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={springPresets.snappy}
                                >
                                  {readStatus.status === 'sent' ? (
                                    <Check className="w-4 h-4 text-primary-foreground/50" />
                                  ) : readStatus.status === 'read_all' ? (
                                    <>
                                      <CheckCheck className="w-4 h-4 text-cyan-300" />
                                      <span className="text-[10px] text-cyan-300">Read by all</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCheck className="w-4 h-4 text-primary-foreground/70" />
                                      <span className="text-[10px] text-primary-foreground/60">
                                        Read by {readStatus.count}
                                      </span>
                                    </>
                                  )}
                                </motion.div>
                              )}
                            </div>

                            {/* Three-dots button — static flex child, always visible but subtle */}
                            <DropdownMenuTrigger asChild>
                              <button
                                className={cn(
                                  "flex-shrink-0 p-2 -mr-2 rounded-full transition-opacity",
                                  isOwnMessage
                                    ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/15"
                                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/10"
                                )}
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </DropdownMenuTrigger>
                          </motion.div>
                          <DropdownMenuContent 
                            side={isOwnMessage ? "left" : "right"}
                            align="start"
                            sideOffset={8}
                            collisionPadding={16}
                            className="z-[60] min-w-[160px] bg-popover border border-border shadow-xl rounded-xl p-1"
                          >
                            {/* Quick Emoji Row */}
                            <div className="flex gap-1 p-2 border-b border-border mb-1">
                              {EMOJI_OPTIONS.slice(0, 4).map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className="w-8 h-8 hover:bg-secondary rounded-lg transition-colors text-lg flex items-center justify-center"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            
                            <DropdownMenuItem 
                              onClick={() => setShowEmojiPicker(message.id)}
                              className="gap-2 cursor-pointer"
                            >
                              <Smile className="w-4 h-4" />
                              <span>More reactions</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => chatInput.setReplyTo({ id: message.id, user_name: message.user_name, text: message.text })}
                              className="gap-2 cursor-pointer"
                            >
                              <Reply className="w-4 h-4" />
                              <span>Reply</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => handleCopyMessage(message.text)}
                              className="gap-2 cursor-pointer"
                            >
                              <Copy className="w-4 h-4" />
                              <span>Copy text</span>
                            </DropdownMenuItem>
                            
                            {isOwnMessage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setSelectedMessageForInfo(message)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Info className="w-4 h-4" />
                                  <span>Message info</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Full Emoji Picker (shown via "More reactions") */}
                        <AnimatePresence>
                          {showEmojiPicker === message.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              transition={springPresets.bouncy}
                              className={cn(
                                "absolute top-full mt-2 z-50 bg-popover border border-border shadow-lg rounded-xl p-2 flex flex-wrap gap-1 max-w-[200px]",
                                isOwnMessage ? "right-0" : "left-0"
                              )}
                            >
                              {EMOJI_OPTIONS.map((emoji) => (
                                <motion.button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className="w-8 h-8 hover:bg-secondary rounded-lg transition-colors text-lg"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                  transition={springPresets.button}
                                >
                                  {emoji}
                                </motion.button>
                              ))}
                              <button
                                onClick={() => setShowEmojiPicker(null)}
                                className="w-8 h-8 hover:bg-secondary rounded-lg transition-colors text-sm text-muted-foreground"
                              >
                                <X className="w-4 h-4 mx-auto" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Reactions */}
                      {Object.keys(reactionCounts).length > 0 && (
                        <div className={cn("flex flex-wrap gap-1", isOwnMessage && "justify-end")}>
                          {Object.entries(reactionCounts).map(([emoji, { count, hasUserReacted }]) => (
                            <motion.button
                              key={emoji}
                              onClick={() => handleReaction(message.id, emoji)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                                hasUserReacted
                                  ? "bg-primary/20 border border-primary/50"
                                  : "bg-secondary hover:bg-secondary/80"
                              )}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              transition={springPresets.button}
                            >
                              <span>{emoji}</span>
                              <span className="text-muted-foreground">{count}</span>
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springPresets.snappy}
              className="px-4 lg:px-6 pb-2"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ 
                        y: [0, -4, 0],
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{ 
                        duration: 0.8, 
                        repeat: Infinity, 
                        ease: 'easeInOut', 
                        delay: i * 0.15 
                      }}
                      className="w-2 h-2 bg-primary rounded-full"
                    />
                  ))}
                </div>
                <span>
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...` 
                    : `${typingUsers.join(', ')} are typing...`}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply Preview */}
        <AnimatePresence>
          {chatInput.replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springPresets.snappy}
              className="border-t border-border bg-secondary/50 px-4 py-2 pb-24"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Reply className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    Replying to <span className="font-medium text-primary">{chatInput.replyTo.user_name}</span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => chatInput.setReplyTo(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground truncate pl-6">{chatInput.replyTo.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom spacing for dock */}
        {!chatInput.replyTo && <div className="h-24 flex-shrink-0" />}
      </div>

      {/* Message Info Modal */}
      <MessageInfoModal
        isOpen={!!selectedMessageForInfo}
        onClose={() => setSelectedMessageForInfo(null)}
        messageText={selectedMessageForInfo?.text || ''}
        sentAt={selectedMessageForInfo?.created_at || ''}
        reads={selectedMessageForInfo ? (messageReads[selectedMessageForInfo.id] || []) : []}
        participants={participants}
        senderId={selectedMessageForInfo?.user_id || ''}
      />
    </div>
  );
}
