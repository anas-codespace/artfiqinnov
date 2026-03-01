import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ThumbsUp, ThumbsDown, MessageCircle, ArrowRight, Plus, Loader2, Check, X } from 'lucide-react';
import { springPresets } from '@/components/ui/spring-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserStatus } from '@/hooks/useUserStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import defaultAvatar from '@/assets/default-avatar.webp';

interface Pitch {
  id: string;
  title: string;
  description: string | null;
  author_id: string;
  status: string;
  votes_up: number;
  votes_down: number;
  feedback: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileSafe {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const pipelineStages = ['💡 Concept', '🔍 Discovery', '📋 Planning', '🚀 Active'];

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
  review: { label: 'In Review', className: 'bg-amber-500/20 text-amber-400' },
  approved: { label: 'Approved', className: 'bg-emerald-500/20 text-emerald-400' },
  rejected: { label: 'Rejected', className: 'bg-destructive/20 text-destructive' },
};

export function InnovationLabTab() {
  const { user, profile } = useAuth();
  const { isFounder } = useUserRole();
  const { isMember } = useUserStatus();
  const { toast } = useToast();

  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [profiles, setProfiles] = useState<ProfileSafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedbackPitchId, setFeedbackPitchId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [newPitch, setNewPitch] = useState({ title: '', description: '' });

  useEffect(() => {
    const fetchData = async () => {
      const [pitchRes, profRes] = await Promise.all([
        supabase.from('pitches').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles_safe').select('user_id, display_name, avatar_url'),
      ]);
      if (!pitchRes.error) setPitches(pitchRes.data || []);
      if (!profRes.error) setProfiles((profRes.data as ProfileSafe[]) || []);
      setIsLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel('pitches-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitches' }, (payload) => {
        if (payload.eventType === 'INSERT') setPitches(prev => [payload.new as Pitch, ...prev]);
        else if (payload.eventType === 'UPDATE') setPitches(prev => prev.map(p => p.id === payload.new.id ? payload.new as Pitch : p));
        else if (payload.eventType === 'DELETE') setPitches(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getAuthor = (authorId: string) => {
    const p = profiles.find(pr => pr.user_id === authorId);
    return { name: p?.display_name || 'Unknown', avatar: p?.avatar_url || defaultAvatar };
  };

  const handleSubmitPitch = async () => {
    if (!newPitch.title.trim() || !user) return;
    const { error } = await supabase.from('pitches').insert({
      title: newPitch.title.trim(),
      description: newPitch.description.trim() || null,
      author_id: user.id,
      status: 'pending',
    });
    if (error) {
      toast({ title: 'Failed to submit pitch', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pitch submitted!' });
      setNewPitch({ title: '', description: '' });
      setShowAddModal(false);
    }
  };

  const handleReview = async (pitchId: string, newStatus: 'approved' | 'rejected') => {
    if (!user) return;
    const update: Record<string, unknown> = { status: newStatus, reviewed_by: user.id };
    if (feedbackPitchId === pitchId && feedbackText.trim()) {
      update.feedback = feedbackText.trim();
    }
    const { error } = await supabase.from('pitches').update(update).eq('id', pitchId);
    if (error) {
      toast({ title: 'Failed to update pitch', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Pitch ${newStatus}!` });
      setFeedbackPitchId(null);
      setFeedbackText('');
    }
  };

  const handleSaveFeedback = async (pitchId: string) => {
    if (!feedbackText.trim()) return;
    const { error } = await supabase.from('pitches').update({ feedback: feedbackText.trim(), status: 'review' }).eq('id', pitchId);
    if (error) {
      toast({ title: 'Failed to save feedback', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Feedback saved!' });
      setFeedbackPitchId(null);
      setFeedbackText('');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const approvedCount = pitches.filter(p => p.status === 'approved').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.snappy} className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron']">Innovation Lab</h1>
          <p className="text-muted-foreground text-sm">{pitches.length} pitches · {approvedCount} approved</p>
        </div>
        {isMember && (
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Submit Pitch
          </Button>
        )}
      </motion.div>

      {/* Pipeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Venture Pipeline</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {pipelineStages.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-medium whitespace-nowrap">
                {stage}
              </div>
              {i < pipelineStages.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pitch Cards */}
      {pitches.length > 0 ? (
        <div className="space-y-3">
          {pitches.map((pitch, i) => {
            const author = getAuthor(pitch.author_id);
            const cfg = statusConfig[pitch.status] || statusConfig.pending;
            return (
              <motion.div
                key={pitch.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="glass-card rounded-xl p-4 border border-border/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <img src={author.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                      <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <h4 className="text-sm font-semibold truncate">{pitch.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">by {author.name}</p>
                    {pitch.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pitch.description}</p>
                    )}
                    {pitch.feedback && (
                      <div className="mt-2 text-xs bg-card/50 rounded-lg px-3 py-2 border border-border/30">
                        <span className="font-medium">Feedback:</span> {pitch.feedback}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp className="w-3 h-3" /> {pitch.votes_up}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsDown className="w-3 h-3" /> {pitch.votes_down}
                  </span>

                  {/* Founder-only review controls */}
                  {isFounder && pitch.status !== 'approved' && pitch.status !== 'rejected' && (
                    <div className="flex items-center gap-2 ml-auto">
                      {feedbackPitchId === pitch.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            placeholder="Feedback..."
                            className="h-7 text-xs w-40"
                          />
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleSaveFeedback(pitch.id)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => { setFeedbackPitchId(pitch.id); setFeedbackText(pitch.feedback || ''); }}
                        >
                          <MessageCircle className="w-3 h-3" /> Feedback
                        </button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:text-emerald-300" onClick={() => handleReview(pitch.id, 'approved')}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive/80" onClick={() => handleReview(pitch.id, 'rejected')}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <Lightbulb className="w-12 h-12 text-amber-500/30 mb-3" />
          <p className="text-muted-foreground text-sm">No pitches yet. Be the first to submit an idea!</p>
        </div>
      )}

      {/* Add Pitch Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Submit a Pitch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newPitch.title}
                onChange={e => setNewPitch(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Your innovative idea..."
                className="bg-background/50"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newPitch.description}
                onChange={e => setNewPitch(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your idea, target market, and potential impact..."
                className="bg-background/50 min-h-[120px]"
                maxLength={2000}
              />
            </div>
            <Button onClick={handleSubmitPitch} disabled={!newPitch.title.trim()} className="w-full">
              Submit Pitch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
