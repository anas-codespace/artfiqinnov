import { motion } from 'framer-motion';
import { Lightbulb, ThumbsUp, ThumbsDown, MessageCircle, ArrowRight } from 'lucide-react';
import { springPresets } from '@/components/ui/spring-config';
import { Button } from '@/components/ui/button';

const samplePitches = [
  { title: 'AI-Powered Customer Support', author: 'Team Member', phase: 'Discovery', votes: 12, status: 'review' },
  { title: 'Mobile Delivery Tracker', author: 'Team Member', phase: 'Phase 2', votes: 8, status: 'approved' },
  { title: 'Automated Invoice System', author: 'Team Member', phase: 'Phase 3', votes: 5, status: 'pending' },
];

const pipelineStages = ['💡 Concept', '🔍 Discovery', '📋 Planning', '🚀 Active'];

export function InnovationLabTab() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.snappy}>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron']">Innovation Lab</h1>
        <p className="text-muted-foreground text-sm">Pitch incubator & venture roadmap</p>
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
      <div className="space-y-3">
        {samplePitches.map((pitch, i) => (
          <motion.div
            key={pitch.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="glass-card rounded-xl p-4 border border-border/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <h4 className="text-sm font-semibold truncate">{pitch.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground">by {pitch.author} · {pitch.phase}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                pitch.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400'
                : pitch.status === 'review' ? 'bg-amber-500/20 text-amber-400'
                : 'bg-muted text-muted-foreground'
              }`}>
                {pitch.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-400 transition-colors">
                <ThumbsUp className="w-3 h-3" /> {pitch.votes}
              </button>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                <ThumbsDown className="w-3 h-3" />
              </button>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto">
                <MessageCircle className="w-3 h-3" /> Feedback
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <Lightbulb className="w-12 h-12 text-amber-500/30 mb-3" />
        <p className="text-muted-foreground text-sm">Full pitch submission form, executive review board & database-powered voting coming in the next phase.</p>
        <Button variant="outline" size="sm" className="mt-3" disabled>Submit a Pitch (Coming Soon)</Button>
      </div>
    </div>
  );
}
