import { motion } from 'framer-motion';
import { BarChart3, Clock, TrendingUp, Milestone } from 'lucide-react';
import { springPresets } from '@/components/ui/spring-config';

export function PerformanceTab() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.snappy}>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron']">Performance Timeline</h1>
        <p className="text-muted-foreground text-sm">Gantt chart view with time tracking & milestone markers</p>
      </motion.div>

      {/* Placeholder Gantt rows */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground mb-2">
          <Clock className="w-4 h-4" />
          <span>Coming Soon — Sprint Timeline</span>
        </div>

        {[
          { label: 'API Integration', progress: 85, status: 'on-track' },
          { label: 'UI Redesign', progress: 60, status: 'on-track' },
          { label: 'Database Migration', progress: 30, status: 'delayed' },
          { label: 'Security Audit', progress: 100, status: 'complete' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4"
          >
            <span className="text-xs font-medium w-32 truncate">{item.label}</span>
            <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden relative">
              <motion.div
                className={`h-full rounded-full ${
                  item.status === 'delayed' ? 'bg-destructive/70' : item.status === 'complete' ? 'bg-emerald-500/70' : 'bg-primary/70'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${item.progress}%` }}
                transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
              />
              {/* Milestone marker */}
              {item.progress >= 50 && (
                <div className="absolute top-0 h-full flex items-center" style={{ left: '50%' }}>
                  <div className="w-0.5 h-full bg-foreground/20" />
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">{item.progress}%</span>
          </motion.div>
        ))}

        <div className="flex items-center gap-2 pt-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary/70" /> On Track</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive/70" /> Delayed</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500/70" /> Complete</div>
          <div className="flex items-center gap-1 ml-auto"><Milestone className="w-3 h-3" /> Milestone</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <BarChart3 className="w-12 h-12 text-primary/30 mb-3" />
        <p className="text-muted-foreground text-sm">Full Gantt chart with drag-to-resize, time comparison & department filters coming in the next phase.</p>
      </div>
    </div>
  );
}
