import { motion } from 'framer-motion';
import { BarChart3, Activity, Trophy, PieChart } from 'lucide-react';
import { springPresets } from '@/components/ui/spring-config';
import { Progress } from '@/components/ui/progress';

const ventures = [
  { name: 'RESQ+', icon: '🚑', progress: 72, color: '#ff3b30' },
  { name: 'Logistics', icon: '📦', progress: 58, color: '#ffcc00' },
  { name: 'Creative Studio', icon: '🎨', progress: 85, color: '#af52de' },
  { name: 'Tech Platform', icon: '💡', progress: 45, color: '#00d2ff' },
];

const departments = [
  { code: 'TD', name: 'Tech Dev', score: 92 },
  { code: 'MO', name: 'Mgmt Ops', score: 78 },
  { code: 'CM', name: 'Creative', score: 88 },
  { code: 'ES', name: 'External', score: 65 },
];

const achievements = [
  '🎉 API Integration Successful — Tech Dev',
  '🏆 Client Onboarding Complete — Mgmt Ops',
  '✅ Brand Kit v2 Delivered — Creative',
  '🚀 Staging Deploy Passed — Tech Dev',
];

export function AnalyticsTab() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.snappy}>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron']">Insights & Analytics</h1>
        <p className="text-muted-foreground text-sm">Health gauges, heatmaps & achievement feed</p>
      </motion.div>

      {/* Health Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ventures.map((v, i) => (
          <motion.div
            key={v.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-xl p-4 text-center"
          >
            <span className="text-2xl">{v.icon}</span>
            <p className="text-xs font-medium mt-1 truncate">{v.name}</p>
            <div className="relative w-16 h-16 mx-auto mt-2">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted/30" />
                <motion.circle
                  cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                  strokeDasharray={`${v.progress} ${100 - v.progress}`}
                  strokeLinecap="round"
                  stroke={v.color}
                  initial={{ strokeDasharray: '0 100' }}
                  animate={{ strokeDasharray: `${v.progress} ${100 - v.progress}` }}
                  transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{v.progress}%</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Department Heatmap */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Department Heatmap</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {departments.map((dept) => (
            <div
              key={dept.code}
              className="rounded-lg p-3 text-center border border-border/50"
              style={{
                backgroundColor: `hsl(187 100% 50% / ${dept.score / 300})`,
              }}
            >
              <p className="text-lg font-bold font-['Orbitron']">{dept.code}</p>
              <p className="text-[10px] text-muted-foreground">{dept.name}</p>
              <p className="text-sm font-semibold mt-1">{dept.score}%</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Achievement Feed */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Achievement Feed</h3>
        </div>
        <div className="space-y-2 overflow-hidden max-h-40">
          {achievements.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="text-xs bg-card/50 rounded-lg px-3 py-2 border border-border/30"
            >
              {a}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <Activity className="w-12 h-12 text-primary/30 mb-3" />
        <p className="text-muted-foreground text-sm">Live data integration, resource allocation charts & trend lines coming in the next phase.</p>
      </div>
    </div>
  );
}
