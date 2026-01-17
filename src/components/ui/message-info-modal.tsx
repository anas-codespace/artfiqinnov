import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CheckCheck, Clock, User } from 'lucide-react';
import { springPresets } from './spring-config';
import { cn } from '@/lib/utils';
import defaultAvatarImg from '@/assets/default-avatar.webp';

interface MessageRead {
  user_id: string;
  user_name?: string;
  read_at: string;
}

interface Participant {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MessageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageText: string;
  sentAt: string;
  reads: MessageRead[];
  participants: Participant[];
  senderId: string;
}

export function MessageInfoModal({
  isOpen,
  onClose,
  messageText,
  sentAt,
  reads,
  participants,
  senderId,
}: MessageInfoModalProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get participants who received but haven't read
  const otherParticipants = participants.filter(p => p.user_id !== senderId);
  const readUserIds = new Set(reads.map(r => r.user_id));
  const deliveredTo = otherParticipants;
  const readBy = otherParticipants.filter(p => readUserIds.has(p.user_id));
  const pendingRead = otherParticipants.filter(p => !readUserIds.has(p.user_id));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={springPresets.modal}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="glass-card rounded-2xl p-6 space-y-6 mx-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Message Info</h3>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springPresets.button}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Message Preview */}
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-sm line-clamp-3">{messageText}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Sent {formatTime(sentAt)}</span>
                </div>
              </div>

              {/* Read By Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCheck className="w-4 h-4 text-cyan-400" />
                  <span>Read by ({readBy.length})</span>
                </div>
                {readBy.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">No one has read this message yet</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {readBy.map((p) => {
                      const readRecord = reads.find(r => r.user_id === p.user_id);
                      return (
                        <motion.div
                          key={p.user_id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={springPresets.snappy}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={p.avatar_url || defaultAvatarImg}
                              alt={p.display_name || 'User'}
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="text-sm">{p.display_name || 'Unknown'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {readRecord ? formatTime(readRecord.read_at) : ''}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Delivered To Section */}
              {pendingRead.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Check className="w-4 h-4 text-muted-foreground" />
                    <span>Delivered to ({pendingRead.length})</span>
                  </div>
                  <div className="space-y-2 pl-6">
                    {pendingRead.map((p) => (
                      <motion.div
                        key={p.user_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={springPresets.snappy}
                        className="flex items-center gap-2"
                      >
                        <img
                          src={p.avatar_url || defaultAvatarImg}
                          alt={p.display_name || 'User'}
                          className="w-8 h-8 rounded-full opacity-60"
                        />
                        <span className="text-sm text-muted-foreground">{p.display_name || 'Unknown'}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
