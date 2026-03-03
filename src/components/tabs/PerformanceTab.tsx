import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Milestone, Loader2 } from 'lucide-react';
import { springPresets } from '@/components/ui/spring-config';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  created_at: string;
  updated_at: string;
  project_id: string | null;
}

interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export function PerformanceTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [tRes, pRes] = await Promise.all([
        supabase.from('tasks').select('id, title, status, priority, created_at, updated_at, project_id').order('created_at', { ascending: true }),
        supabase.from('projects').select('id, name, icon, color'),
      ]);
      if (!tRes.error) setTasks(tRes.data || []);
      if (!pRes.error) setProjects(pRes.data || []);
      setIsLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel('performance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        supabase.from('tasks').select('id, title, status, priority, created_at, updated_at, project_id').order('created_at', { ascending: true }).then(({ data }) => {
          if (data) setTasks(data);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredTasks = useMemo(() => {
    if (!filterProject) return tasks;
    return tasks.filter(t => t.project_id === filterProject);
  }, [tasks, filterProject]);

  // Calculate bar widths based on time elapsed
  const ganttItems = useMemo(() => {
    if (filteredTasks.length === 0) return [];
    const now = new Date();
    const earliest = new Date(filteredTasks[0].created_at);
    const totalSpan = Math.max(now.getTime() - earliest.getTime(), 1);

    return filteredTasks.map(t => {
      const start = new Date(t.created_at);
      const end = (t.status === 'deployed' || t.status === 'verified') ? new Date(t.updated_at) : now;
      const duration = end.getTime() - start.getTime();
      const offset = ((start.getTime() - earliest.getTime()) / totalSpan) * 100;
      const width = Math.max((duration / totalSpan) * 100, 2);
      const isOverdue = !['deployed', 'verified', 'pending-verification'].includes(t.status) && t.priority === 'urgent';

      let statusColor = 'bg-primary/70';
      if (t.status === 'verified') statusColor = 'bg-emerald-500/70';
      else if (t.status === 'deployed') statusColor = 'bg-emerald-500/50';
      else if (t.status === 'pending-verification') statusColor = 'bg-purple-500/70';
      else if (isOverdue) statusColor = 'bg-destructive/70';

      return {
        ...t,
        offset: Math.min(offset, 98),
        width: Math.min(width, 100 - offset),
        isOverdue,
        statusColor,
      };
    });
  }, [filteredTasks]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.snappy}>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron']">Performance Timeline</h1>
        <p className="text-muted-foreground text-sm">Gantt chart view — live task data</p>
      </motion.div>

      {/* Project Filters */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterProject(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
              !filterProject ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-card/50 border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Projects
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterProject(filterProject === p.id ? null : p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                filterProject === p.id ? 'border-primary/50 text-primary' : 'bg-card/50 border-border/50 text-muted-foreground hover:text-foreground'
              }`}
              style={filterProject === p.id ? { backgroundColor: `${p.color}20` } : {}}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Gantt Chart */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground mb-2">
          <Clock className="w-4 h-4" />
          <span>Task Timeline ({filteredTasks.length} tasks)</span>
        </div>

        {ganttItems.length > 0 ? (
          <>
            {ganttItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4"
              >
                <span className="text-xs font-medium w-32 truncate" title={item.title}>{item.title}</span>
                <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden relative">
                  <motion.div
                    className={`h-full rounded-full absolute top-0 ${item.statusColor}`}
                    style={{ left: `${item.offset}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.width}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right capitalize">{item.status}</span>
              </motion.div>
            ))}

            <div className="flex items-center gap-2 pt-3 text-[10px] text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary/70" /> Active</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500/70" /> Pending Verification</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive/70" /> Urgent</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500/70" /> Verified</div>
              <div className="flex items-center gap-1 ml-auto"><Milestone className="w-3 h-3" /> Milestone</div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No tasks found. Create tasks in the Task Matrix to see the timeline.</p>
          </div>
        )}
      </div>
    </div>
  );
}
