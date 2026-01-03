import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    userId: 'user_ceo',
    userName: 'Mohammed Sulaiman',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sulaiman',
    text: 'Welcome to the ARTFIQ team chat! 🚀',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    userId: 'user_cto',
    userName: 'Mohammed Anas',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anas',
    text: 'Great to have everyone here. Let\'s build something amazing together!',
    timestamp: new Date(Date.now() - 3000000),
  },
  {
    id: '3',
    userId: 'user_ceo',
    userName: 'Mohammed Sulaiman',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sulaiman',
    text: 'The new workspace is looking incredible. Anas, great work on the UI!',
    timestamp: new Date(Date.now() - 1800000),
  },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatTab() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !user) return;

    const message: Message = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
          {messages.length} messages • {3} members online
        </p>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 scrollbar-cyber">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const isOwnMessage = message.userId === user?.id;
            const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-3",
                  isOwnMessage && "flex-row-reverse"
                )}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-10">
                  {showAvatar && (
                    <motion.img
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      src={message.userAvatar}
                      alt={message.userName}
                      className="w-10 h-10 rounded-full border border-border"
                    />
                  )}
                </div>

                {/* Message Content */}
                <div className={cn(
                  "max-w-[70%] space-y-1",
                  isOwnMessage && "items-end"
                )}>
                  {showAvatar && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      isOwnMessage && "flex-row-reverse"
                    )}>
                      <span className="font-medium">{message.userName}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl",
                    isOwnMessage
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "glass-card rounded-tl-md"
                  )}>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 p-4 lg:p-6 border-t border-border bg-background/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="pr-10 bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </div>

          <Button
            variant="cyber"
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
