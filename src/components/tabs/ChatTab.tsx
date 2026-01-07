import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Reply, X, CheckCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SoftFloat } from '@/components/ui/soft-float';
import artfiqLogo from '@/assets/artfiq-logo.jpeg';

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
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [messageReads, setMessageReads] = useState<Record<string, MessageRead[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [presenceData, setPresenceData] = useState<Record<string, UserPresence>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Fetch participants and presence
  useEffect(() => {
    const fetchParticipants = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url')
        .order('created_at', { ascending: true });

      const { data: presence } = await supabase
        .from('user_presence')
        .select('*');

      const presenceMap: Record<string, UserPresence> = {};
      presence?.forEach(p => {
        presenceMap[p.user_id] = p;
      });
      setPresenceData(presenceMap);

      if (profiles) {
        setParticipants(profiles.map(p => ({
          ...p,
          isOnline: presenceMap[p.user_id]?.is_online ?? false,
          isTyping: presenceMap[p.user_id]?.is_typing ?? false,
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
  }, [user?.id, participants]);

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

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    updatePresence(false);
    
    const messageText = newMessage.trim();
    setNewMessage('');
    const replyToId = replyTo?.id || null;
    setReplyTo(null);

    try {
      const { error } = await supabase.from('messages').insert({
        user_id: user.id,
        user_name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
        user_avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        text: messageText,
        reply_to: replyToId,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
      setNewMessage(messageText);
    }

    setIsSending(false);
  };

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  const onlineParticipants = participants.filter(p => p.isOnline || presenceData[p.user_id]?.is_online);

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen relative overflow-hidden">
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

      {/* Participants Sidebar */}
      <SoftFloat delay={0.1} className="hidden md:flex flex-col w-64 border-r border-border bg-background/80 backdrop-blur-xl z-10">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Participants ({onlineParticipants.length}/{participants.length})
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-cyber">
          {participants.map((participant, index) => {
            const isOnline = participant.isOnline || presenceData[participant.user_id]?.is_online;
            const isTyping = participant.isTyping || presenceData[participant.user_id]?.is_typing;
            
            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="relative">
                  <img
                    src={participant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.user_id}`}
                    alt={participant.display_name || 'User'}
                    className="w-9 h-9 rounded-full border border-border"
                  />
                  {/* Online indicator with glow */}
                  <motion.span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                      isOnline 
                        ? "bg-green-500" 
                        : "bg-muted-foreground/50"
                    )}
                    animate={isOnline ? {
                      boxShadow: [
                        '0 0 0px rgba(34,197,94,0.4)',
                        '0 0 8px rgba(34,197,94,0.6)',
                        '0 0 0px rgba(34,197,94,0.4)',
                      ],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {participant.display_name || 'Unknown'}
                  </p>
                  {isTyping ? (
                    <motion.p 
                      className="text-xs text-primary flex items-center gap-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <span>typing</span>
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >...</motion.span>
                    </motion.p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isOnline ? (
                        <span className="text-green-400">Online</span>
                      ) : (
                        'Offline'
                      )}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </SoftFloat>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col z-10">
        {/* Header */}
        <SoftFloat delay={0} className="flex-shrink-0 p-4 lg:p-6 border-b border-border bg-background/80 backdrop-blur-xl">
          <h1 className="text-2xl font-bold">Team Chat</h1>
          <p className="text-sm text-muted-foreground">
            {messages.length} messages • {onlineParticipants.length} online
          </p>
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
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className={cn("flex gap-3 group", isOwnMessage && "flex-row-reverse")}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10">
                      {showAvatar && (
                        <motion.img
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          src={message.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user_id}`}
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
                        <motion.div 
                          className={cn(
                            "px-4 py-2.5 rounded-2xl",
                            isOwnMessage
                              ? "bg-primary text-primary-foreground rounded-tr-md"
                              : "glass-card rounded-tl-md"
                          )}
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                          <p className="text-sm leading-relaxed">{message.text}</p>
                          
                          {/* Read receipt for own messages */}
                          {isOwnMessage && readStatus && (
                            <motion.div 
                              className="flex items-center justify-end gap-1 mt-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
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
                        </motion.div>

                        {/* Action buttons */}
                        <div className={cn(
                          "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                          isOwnMessage ? "-left-16" : "-right-16"
                        )}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                          >
                            <Smile className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setReplyTo(message)}
                          >
                            <Reply className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Emoji Picker */}
                        <AnimatePresence>
                          {showEmojiPicker === message.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                              className={cn(
                                "absolute top-full mt-2 z-50 glass-card rounded-lg p-2 flex gap-1",
                                isOwnMessage ? "right-0" : "left-0"
                              )}
                            >
                              {EMOJI_OPTIONS.map((emoji) => (
                                <motion.button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className="w-8 h-8 hover:bg-secondary rounded transition-colors text-lg"
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  {emoji}
                                </motion.button>
                              ))}
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
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border bg-secondary/50 px-4 py-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Reply className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    Replying to <span className="font-medium text-primary">{replyTo.user_name}</span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setReplyTo(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground truncate pl-6">{replyTo.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <SoftFloat delay={0.3} className="flex-shrink-0 p-4 lg:p-6 border-t border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <motion.div 
              className="flex-1 relative"
              whileFocus={{ scale: 1.01 }}
            >
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyPress}
                placeholder={replyTo ? `Reply to ${replyTo.user_name}...` : "Type a message..."}
                className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
                disabled={isSending}
              />
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="cyber"
                size="icon"
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                className="flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </SoftFloat>
      </div>
    </div>
  );
}
