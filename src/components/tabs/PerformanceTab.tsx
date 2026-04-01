import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Milestone, Loader2, Users, TrendingUp, FileText, Download } from 'lucide-react';
import { springPresets } from '@/components/ui/spring-config';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceRing } from '@/components/ui/attendance-ring';
import { fetchTeamAttendance, fetchUserWorkLogs } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import defaultAvatarImg from '@/assets/default-avatar.webp';

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

interface TeamMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface AttendanceStat {
  percentage: number;
  daysPresent: number;
  totalDays: number;
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function PerformanceTab() {
  const { user } = useAuth();
  const { isAdmin, isFounder } = useUserRole();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStat>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  
  // Personal work stats
  const [myAvgMinutes, setMyAvgMinutes] = useState<number | null>(null);
  const [myRecentLogs, setMyRecentLogs] = useState<Array<{ date: string; work_duration_minutes: number | null }>>([]);
  // Overall stats since joining
  const [overallStats, setOverallStats] = useState<{ totalDaysPresent: number; totalDaysWorked: number; joinDate: string | null }>({ totalDaysPresent: 0, totalDaysWorked: 0, joinDate: null });

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

  // Fetch personal work logs + overall stats
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchPersonalStats = async () => {
      const logs = await fetchUserWorkLogs(user.id);
      setMyRecentLogs(logs);
      const withDuration = logs.filter(l => l.work_duration_minutes && l.work_duration_minutes > 0);
      if (withDuration.length > 0) {
        const total = withDuration.reduce((s, l) => s + (l.work_duration_minutes || 0), 0);
        setMyAvgMinutes(Math.round(total / withDuration.length));
      }

      // Overall stats since joining
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', user.id)
        .single();
      
      const { count } = await supabase
        .from('attendance_logs')
        .select('date', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'Present');

      setOverallStats({
        totalDaysPresent: count || 0,
        totalDaysWorked: logs.length,
        joinDate: profile?.created_at?.split('T')[0] || null,
      });
    };

    fetchPersonalStats();
  }, [user?.id]);

  // Fetch team members + attendance
  useEffect(() => {
    const fetchTeam = async () => {
      setAttendanceLoading(true);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, created_at')
        .eq('access_status', 'approved_member')
        .order('display_name', { ascending: true });

      if (profiles && profiles.length > 0) {
        setTeamMembers(profiles);
        const joinDates: Record<string, string> = {};
        profiles.forEach(p => { joinDates[p.user_id] = p.created_at; });
        const attendance = await fetchTeamAttendance(profiles.map(p => p.user_id), joinDates);
        setAttendanceMap(attendance);
      }
      setAttendanceLoading(false);
    };
    fetchTeam();

    const channel = supabase
      .channel('attendance-performance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => {
        fetchTeam();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredTasks = useMemo(() => {
    if (!filterProject) return tasks;
    return tasks.filter(t => t.project_id === filterProject);
  }, [tasks, filterProject]);

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

  const currentMonthName = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Generate report data
  const reportData = useMemo(() => {
    const now = new Date();
    const logsThisMonth = myRecentLogs.filter(l => {
      const d = new Date(l.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalHours = logsThisMonth.reduce((s, l) => s + (l.work_duration_minutes || 0), 0);
    const avgHours = logsThisMonth.length > 0 ? Math.round(totalHours / logsThisMonth.length) : 0;

    return {
      month: currentMonthName,
      totalDaysPresent: logsThisMonth.length,
      totalHoursWorked: formatDuration(totalHours),
      averagePerDay: formatDuration(avgHours),
      logs: logsThisMonth,
    };
  }, [myRecentLogs, currentMonthName]);

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
        <p className="text-muted-foreground text-sm">Monthly cycle — {currentMonthName}</p>
      </motion.div>

      {/* Personal Work Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPresets.snappy, delay: 0.05 }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-3 text-sm font-medium text-muted-foreground">
          <TrendingUp className="w-4 h-4" />
          <span>Your Work Stats</span>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {myAvgMinutes !== null ? formatDuration(myAvgMinutes) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">Avg Work Time / Day</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {overallStats.totalDaysPresent}
            </p>
            <p className="text-[10px] text-muted-foreground">Total Days Since Joining</p>
          </div>
          {myRecentLogs.filter(l => l.work_duration_minutes).length > 0 && (
            <div className="flex items-end gap-1 h-10">
              {myRecentLogs.filter(l => l.work_duration_minutes).slice(0, 7).reverse().map((log, i) => {
                const maxMins = Math.max(...myRecentLogs.filter(l => l.work_duration_minutes).map(l => l.work_duration_minutes || 1));
                const pct = ((log.work_duration_minutes || 0) / maxMins) * 100;
                return (
                  <motion.div
                    key={log.date}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct, 10)}%` }}
                    transition={{ delay: i * 0.05 }}
                    className="w-3 rounded-full bg-primary/50"
                    title={`${log.date}: ${formatDuration(log.work_duration_minutes || 0)}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Attendance Report Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPresets.snappy, delay: 0.08 }}
        className="glass-card rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>Attendance Report — {currentMonthName}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReport(!showReport)}
            className="text-xs gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            {showReport ? 'Hide Report' : 'Generate Report'}
          </Button>
        </div>

        {showReport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-secondary/30 rounded-xl p-4 space-y-3 font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="font-bold text-sm text-foreground">📊 Monthly Report</span>
              <span className="text-muted-foreground">{reportData.month}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Days Present</p>
                <p className="text-lg font-bold text-primary">{reportData.totalDaysPresent}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Hours</p>
                <p className="text-lg font-bold text-foreground">{reportData.totalHoursWorked}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg / Day</p>
                <p className="text-lg font-bold text-foreground">{reportData.averagePerDay}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Since Joining</p>
                <p className="text-lg font-bold text-foreground">{overallStats.totalDaysPresent} days</p>
              </div>
            </div>
            {reportData.logs.length > 0 && (
              <div className="border-t border-border/50 pt-2 space-y-1">
                <p className="text-muted-foreground font-bold">Daily Breakdown</p>
                {reportData.logs.map(l => (
                  <div key={l.date} className="flex justify-between">
                    <span>{l.date}</span>
                    <span className="text-primary">{l.work_duration_minutes ? formatDuration(l.work_duration_minutes) : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Attendance Health Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPresets.snappy, delay: 0.1 }}
        className="glass-card rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>Team Attendance — {currentMonthName}</span>
        </div>

        {attendanceLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : teamMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No team members found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {teamMembers.map((member, i) => {
              const stat = attendanceMap[member.user_id];
              const pct = stat?.percentage ?? 100;

              return (
                <motion.div
                  key={member.user_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50"
                >
                  <img
                    src={member.avatar_url || defaultAvatarImg}
                    alt={member.display_name || 'User'}
                    className="w-8 h-8 rounded-full border border-border flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{member.display_name || 'User'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {stat ? `${stat.daysPresent}/${stat.totalDays} this month` : '—'}
                    </p>
                  </div>
                  <AttendanceRing percentage={pct} size={36} strokeWidth={3} />
                </motion.div>
              );
            })}
          </div>
        )}
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
