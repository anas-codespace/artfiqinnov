import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Clock, User } from 'lucide-react';
import { springPresets } from './spring-config';

interface FileView {
  id: string;
  user_id: string;
  user_name: string;
  viewed_at: string;
}

interface FileViewersModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  viewers: FileView[];
}

export function FileViewersModal({
  isOpen,
  onClose,
  fileName,
  viewers,
}: FileViewersModalProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  };

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
          
          {/* Modal - Fully responsive */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={springPresets.modal}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-auto sm:w-full sm:max-w-md flex items-center justify-center sm:block"
          >
            <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 w-full max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-semibold truncate">File Views</h3>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={springPresets.button}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* File Name */}
              <div className="bg-secondary/50 rounded-xl p-3 sm:p-4">
                <p className="text-sm font-medium break-words">{fileName}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3 flex-shrink-0" />
                  <span>{viewers.length} view{viewers.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Viewers List */}
              <div className="space-y-3 max-h-48 sm:max-h-64 overflow-y-auto scrollbar-cyber">
                {viewers.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <User className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-xs sm:text-sm text-muted-foreground">No one has viewed this file yet</p>
                  </div>
                ) : (
                  viewers.map((viewer, index) => (
                    <motion.div
                      key={viewer.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...springPresets.snappy, delay: index * 0.05 }}
                      className="flex items-center justify-between gap-2 p-3 bg-secondary/30 rounded-xl"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${viewer.user_id}`}
                          alt={viewer.user_name}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                        />
                        <span className="font-medium text-sm truncate">{viewer.user_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <span className="hidden xs:inline">{formatTime(viewer.viewed_at)}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
