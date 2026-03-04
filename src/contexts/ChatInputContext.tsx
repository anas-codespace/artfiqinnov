import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface ChatInputContextType {
  newMessage: string;
  setNewMessage: (msg: string) => void;
  isSending: boolean;
  setIsSending: (v: boolean) => void;
  replyTo: { id: string; user_name: string; text: string } | null;
  setReplyTo: (r: { id: string; user_name: string; text: string } | null) => void;
  onSend: () => void;
  registerSendHandler: (handler: () => void) => void;
  onTyping: () => void;
  registerTypingHandler: (handler: () => void) => void;
  isChatFocused: boolean;
  setIsChatFocused: (v: boolean) => void;
}

const ChatInputContext = createContext<ChatInputContextType | null>(null);

export function ChatInputProvider({ children }: { children: ReactNode }) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; user_name: string; text: string } | null>(null);
  const [isChatFocused, setIsChatFocused] = useState(false);
  const sendHandlerRef = useRef<(() => void) | null>(null);
  const typingHandlerRef = useRef<(() => void) | null>(null);

  const registerSendHandler = useCallback((handler: () => void) => {
    sendHandlerRef.current = handler;
  }, []);

  const registerTypingHandler = useCallback((handler: () => void) => {
    typingHandlerRef.current = handler;
  }, []);

  const onSend = useCallback(() => {
    sendHandlerRef.current?.();
  }, []);

  const onTyping = useCallback(() => {
    typingHandlerRef.current?.();
  }, []);

  return (
    <ChatInputContext.Provider value={{
      newMessage, setNewMessage,
      isSending, setIsSending,
      replyTo, setReplyTo,
      onSend, registerSendHandler,
      onTyping, registerTypingHandler,
      isChatFocused, setIsChatFocused,
    }}>
      {children}
    </ChatInputContext.Provider>
  );
}

export function useChatInput() {
  const ctx = useContext(ChatInputContext);
  if (!ctx) throw new Error('useChatInput must be used within ChatInputProvider');
  return ctx;
}
