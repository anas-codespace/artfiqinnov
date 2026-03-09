import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Plus, Send, Loader2, FileText, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { useUserStatus } from '@/hooks/useUserStatus';
import defaultAvatar from '@/assets/default-avatar.webp';

interface Notice {
  id: string;
  title: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  created_by: string;
}

interface NoticeWithProfile extends Notice {
  poster_name: string;
  poster_avatar: string;
}

export function NoticeBoard() {
  const { user, isGuest } = useAuth();
  const { isFounder } = useUserRole();
  const { isMember } = useUserStatus();
  const { toast } = useToast();
  const [notices, setNotices] = useState<NoticeWithProfile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotices = async () => {
    const { data } = await supabase
      .from('notice_board')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return;

    // Fetch poster profiles
    const creatorIds = [...new Set(data.map(n => n.created_by))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', creatorIds);

    const profileMap = new Map(
      profiles?.map(p => [p.user_id, { name: p.display_name || 'Founder', avatar: p.avatar_url || defaultAvatar }]) || []
    );

    setNotices(
      data.map(n => ({
        ...n,
        poster_name: profileMap.get(n.created_by)?.name || 'Founder',
        poster_avatar: profileMap.get(n.created_by)?.avatar || defaultAvatar,
      }))
    );
  };

  useEffect(() => {
    fetchNotices();

    const channel = supabase
      .channel('notice-board-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notice_board' }, () => {
        fetchNotices();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setIsSubmitting(true);

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    try {
      if (file) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const isPdf = ext === 'pdf';
        const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '');

        if (!isPdf && !isImage) {
          toast({ title: 'Invalid file', description: 'Only images and PDFs are allowed.', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        mediaType = isPdf ? 'pdf' : 'image';
        const filePath = `${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('notices')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('notices').getPublicUrl(filePath);
        mediaUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('notice_board').insert({
        title: title.trim(),
        content: content.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
        created_by: user.id,
      });

      if (error) throw error;

      toast({ title: 'Notice posted!', description: 'Your announcement is now visible to the team.' });
      setTitle('');
      setContent('');
      setFile(null);
      setIsCreating(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to post notice.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noticeId: string) => {
    setDeletingId(noticeId);
    const { error } = await supabase.from('notice_board').delete().eq('id', noticeId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete notice.', variant: 'destructive' });
    }
    setDeletingId(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  // Hide for guests and visitors — only approved members & founders can see
  if (isGuest || !isMember) return null;
  if (notices.length === 0 && !isFounder) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="relative z-10"
    >
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notice Board</h2>
              <p className="text-xs text-muted-foreground">Official announcements from Leadership</p>
            </div>
          </div>
          {isFounder && !isCreating && (
            <Button size="sm" onClick={() => setIsCreating(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Notice</span>
            </Button>
          )}
        </div>

        {/* Create Form (Founders Only) */}
        <AnimatePresence>
          {isCreating && isFounder && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border/50"
            >
              <div className="p-4 sm:p-5 space-y-3 bg-primary/5">
                <Input
                  placeholder="Notice title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={150}
                  className="bg-background/60"
                />
                <Textarea
                  placeholder="Write your announcement..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="bg-background/60 resize-none"
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.pdf"
                      className="hidden"
                      onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-background/60 hover:bg-background transition-colors">
                      <ImageIcon className="w-4 h-4" />
                      <span>{file ? file.name : 'Attach photo or PDF'}</span>
                    </div>
                  </label>
                  {file && (
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-xs gap-1 text-destructive hover:text-destructive">
                      <X className="w-3 h-3" /> Remove
                    </Button>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setIsCreating(false); setTitle(''); setContent(''); setFile(null); }}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                    className="gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Post Notice
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notices List */}
        <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
          {notices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No announcements yet</p>
            </div>
          ) : (
            notices.map((notice, i) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 sm:p-5 hover:bg-secondary/30 transition-colors"
              >
                {/* Poster info */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={notice.poster_avatar}
                      alt={notice.poster_name}
                      className="w-8 h-8 rounded-full border border-primary/20 flex-shrink-0 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{notice.poster_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(notice.created_at)}</p>
                    </div>
                  </div>
                  {isFounder && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                      disabled={deletingId === notice.id}
                      onClick={() => handleDelete(notice.id)}
                    >
                      {deletingId === notice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>

                {/* Notice content */}
                <h3 className="font-semibold text-base mb-1">{notice.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{notice.content}</p>

                {/* Media */}
                {notice.media_type === 'image' && notice.media_url && (
                  <motion.img
                    src={notice.media_url}
                    alt={notice.title}
                    className="mt-3 rounded-xl w-full max-h-72 object-cover border border-border/30"
                    whileHover={{ scale: 1.01 }}
                    loading="lazy"
                  />
                )}
                {notice.media_type === 'pdf' && notice.media_url && (
                  <a
                    href={notice.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    View Attached PDF
                  </a>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}
