import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Trophy, PieChart, Loader2 } from 'lucide-react';
import { springPresets } from '@/components/ui/spring-config';
import { supabase } from '@/integrations/supabase/client';
import { DEPARTMENTS, DEPARTMENT_MAPPING } from '@/lib/department-mapping';

interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Task {
  id: string;
  status: string;
  project_id: string | null;
  updated_at: string;
  title: string;
  created_by_name: string;
}

interface ProfileSafe {
  user_id: string;
  display_name: string | null;
  department: string | null;
  posting: string | null;
  access_status: string | null;
}

export function AnalyticsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<ProfileSafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [projRes, taskRes, profRes] = await Promise.all([
        supabase.from('projects').select('id, name, icon, color'),
        supabase.from('tasks').select('id, status, project_id, updated_at, title, created_by_name').order('updated_at', { ascending: false }),
        supabase.from('profiles_safe').select('user_id, display_name, department, posting, access_status'),
      ]);
      if (!projRes.error) setProjects(projRes.data || []);
      if (!taskRes.error) setTasks(taskRes.data || []);
      if (!profRes.error) setProfiles((profRes.data as unknown as ProfileSafe[]) || []);
      setIsLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        supabase.from('tasks').select('id, status, project_id, updated_at, title, created_by_name').order('updated_at', { ascending: false }).then(({ data }) => {
          if (data) setTasks(data);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Compute venture health from real tasks
  const ventureHealth = useMemo(() => {
    return projects.map(p => {
      const projectTasks = tasks.filter(t => t.project_id === p.id);
      const total = projectTasks.length;
      const deployed = projectTasks.filter(t => t.status === 'deployed').length;
      const progress = total > 0 ? Math.round((deployed / total) * 100) : 0;
      return { ...p, progress, total };
    });
  }, [projects, tasks]);

  // Compute department heatmap from profiles + posting mapping
  const departmentScores = useMemo(() => {
    const activeProfiles = profiles.filter(p => p.access_status === 'approved_member');
    
    return DEPARTMENTS.map(dept => {
      const memberCount = activeProfiles.filter(p => {
        // First check the stored department column
        if (p.department === dept.code) return true;
        // Fallback: derive from posting via mapping
        if (p.posting && DEPARTMENT_MAPPING[p.posting] === dept.code) return true;
        return false;
      }).length;
      
      return { ...dept, memberCount };
    });
  }, [profiles]);

  // Recent achievements: last 5 deployed tasks
  const achievements = useMemo(() => {
    return tasks
      .filter(t => t.status === 'deployed')
      .slice(0, 5)
      .map(t => `🎉 ${t.title} — ${t.created_by_name}`);
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.snappy}>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron']">Insights & Analytics</h1>
        <p className="text-muted-foreground text-sm">Health gauges, heatmaps & achievement feed — all live data</p>
      </motion.div>

      {/* Health Gauges */}
      {ventureHealth.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ventureHealth.map((v, i) => (
            <motion.div
              key={v.id}
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
              <p className="text-[10px] text-muted-foreground mt-1">{v.total} tasks</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">No projects found. Create projects in Task Matrix to see health gauges.</p>
        </div>
      )}

      {/* Department Heatmap */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Department Heatmap</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {departmentScores.map((dept) => (
            <div
              key={dept.code}
              className="rounded-lg p-3 text-center border border-border/50"
              style={{
                backgroundColor: `hsl(187 100% 50% / ${Math.max(dept.memberCount * 0.12, 0.05)})`,
              }}
            >
              <p className="text-lg font-bold font-['Orbitron']">{dept.code}</p>
              <p className="text-[10px] text-muted-foreground">{dept.name}</p>
              <p className="text-sm font-semibold mt-1">{dept.memberCount} {dept.memberCount === 1 ? 'member' : 'members'}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Achievement Feed */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Recent Achievements</h3>
        </div>
        {achievements.length > 0 ? (
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
        ) : (
          <p className="text-xs text-muted-foreground">No deployed tasks yet. Achievements appear when tasks reach "Deployed" status.</p>
        )}
      </motion.div>

      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <Activity className="w-12 h-12 text-primary/30 mb-3" />
        <p className="text-muted-foreground text-sm">Resource allocation charts & trend lines coming in the next phase.</p>
      </div>
    </div>
  );
}
