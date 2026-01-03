import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Reply, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch initial messages and reactions
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
        // Create a map for quick lookup of reply messages
        const messageMap = new Map(messagesData?.map(m => [m.id, m]) || []);
        
        // Attach reply messages
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

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
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
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // Add reaction
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 p-4 lg:p-6 border-b border-border"
      >
        <h1 className="text-2xl font-bold">Team Chat</h1>
        <p className="text-sm text-muted-foreground">
          {messages.length} messages • Real-time sync enabled
        </p>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 scrollbar-cyber">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isOwnMessage = message.user_id === user?.id;
              const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
              const reactionCounts = getReactionCounts(message.id);

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex gap-3 group", isOwnMessage && "flex-row-reverse")}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10">
                    {showAvatar && (
                      <motion.img
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
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
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground rounded-tr-md"
                          : "glass-card rounded-tl-md"
                      )}>
                        <p className="text-sm leading-relaxed">{message.text}</p>
                      </div>

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
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={cn(
                              "absolute top-full mt-2 z-50 glass-card rounded-lg p-2 flex gap-1",
                              isOwnMessage ? "right-0" : "left-0"
                            )}
                          >
                            {EMOJI_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(message.id, emoji)}
                                className="w-8 h-8 hover:bg-secondary rounded transition-colors text-lg"
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Reactions */}
                    {Object.keys(reactionCounts).length > 0 && (
                      <div className={cn("flex flex-wrap gap-1", isOwnMessage && "justify-end")}>
                        {Object.entries(reactionCounts).map(([emoji, { count, hasUserReacted }]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                              hasUserReacted
                                ? "bg-primary/20 border border-primary/50"
                                : "bg-secondary hover:bg-secondary/80"
                            )}
                          >
                            <span>{emoji}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </button>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 p-4 lg:p-6 border-t border-border bg-background/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={replyTo ? `Reply to ${replyTo.user_name}...` : "Type a message..."}
              className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
              disabled={isSending}
            />
          </div>

          <Button
            variant="cyber"
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
