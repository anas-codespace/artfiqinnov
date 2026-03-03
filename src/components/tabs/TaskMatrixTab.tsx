import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, User, Users, UserCheck, Lock, MessageSquare, FolderPlus, Filter, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserStatus } from '@/hooks/useUserStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { springPresets } from '@/components/ui/spring-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import defaultAvatar from '@/assets/default-avatar.webp';

interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  created_by: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'in-dev' | 'quality-check' | 'deployed' | 'pending-verification' | 'verified';
  assigned_to: string | null;
  created_by: string;
  created_by_name: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  project_id: string | null;
}

interface TeamMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

const columns = [
  { id: 'backlog', label: 'Backlog', color: 'from-slate-500/20 to-slate-600/10', dotColor: 'bg-slate-500' },
  { id: 'in-dev', label: 'In-Dev', color: 'from-blue-500/20 to-blue-600/10', dotColor: 'bg-blue-500' },
  { id: 'quality-check', label: 'QC', color: 'from-amber-500/20 to-amber-600/10', dotColor: 'bg-amber-500' },
  { id: 'pending-verification', label: 'Pending ✓', color: 'from-purple-500/20 to-purple-600/10', dotColor: 'bg-purple-500' },
  { id: 'verified', label: 'Verified', color: 'from-emerald-500/20 to-emerald-600/10', dotColor: 'bg-emerald-500' },
] as const;

const priorityConfig = {
  low: { border: 'border-l-slate-500', label: '🟢', bg: 'bg-slate-500/10' },
  normal: { border: 'border-l-primary', label: '🔵', bg: 'bg-primary/10' },
  high: { border: 'border-l-amber-500', label: '🟡', bg: 'bg-amber-500/10' },
  urgent: { border: 'border-l-destructive', label: '🔴', bg: 'bg-destructive/10' },
};

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const ENTIRE_TEAM = 'ALL';

export function TaskMatrixTab() {
  const { user, profile } = useAuth();
  const { isFounder, isLoading: roleLoading } = useUserRole();
  const { isVisitor, isPending } = useUserStatus();
  const { toast } = useToast();
  const isRestricted = isVisitor || isPending;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProjectFilter, setActiveProjectFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'normal' as Task['priority'],
    assignedTo: '',
    projectId: '',
  });

  const [newProject, setNewProject] = useState({
    name: '',
    icon: '📁',
    color: '#00d2ff',
    description: '',
  });

  const projectIcons = ['🚑', '📦', '🎨', '💡', '🔧', '📱', '🌐', '🏗️', '🎯', '🚀', '📊', '🛡️'];

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      const [tasksRes, projectsRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: true }),
        supabase.from('projects').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles_safe').select('user_id, display_name, avatar_url, email').order('created_at', { ascending: true }),
      ]);

      if (!tasksRes.error) setTasks((tasksRes.data as Task[]) || []);
      if (!projectsRes.error) setProjects((projectsRes.data as Project[]) || []);
      if (!membersRes.error) setTeamMembers((membersRes.data as TeamMember[]) || []);
      setIsLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel('tasks-projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') setTasks(prev => [...prev, payload.new as Task]);
        else if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t));
        else if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        if (payload.eventType === 'INSERT') setProjects(prev => [...prev, payload.new as Project]);
        else if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new as Project : p));
        else if (payload.eventType === 'DELETE') setProjects(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!activeProjectFilter) return tasks;
    if (activeProjectFilter === 'unassigned') return tasks.filter(t => !t.project_id);
    return tasks.filter(t => t.project_id === activeProjectFilter);
  }, [tasks, activeProjectFilter]);

  const getTasksByStatus = (status: Task['status']) => filteredTasks.filter(t => t.status === status);

  // Column progress calculation
  const getColumnProgress = (status: Task['status']) => {
    const columnTasks = getTasksByStatus(status);
    const total = filteredTasks.length;
    if (total === 0) return 0;
    return Math.round((columnTasks.length / total) * 100);
  };

  // Overall project progress
  const getProjectProgress = () => {
    if (filteredTasks.length === 0) return 0;
    const verified = filteredTasks.filter(t => t.status === 'verified').length;
    return Math.round((verified / filteredTasks.length) * 100);
  };

  const getAssigneeName = (assignedTo: string | null) => {
    if (!assignedTo) return 'Entire Team';
    const member = teamMembers.find(m => m.user_id === assignedTo);
    return member?.display_name || member?.email?.split('@')[0] || 'Unknown';
  };

  const getAssigneeAvatar = (assignedTo: string | null) => {
    if (!assignedTo) return null;
    const member = teamMembers.find(m => m.user_id === assignedTo);
    return member?.avatar_url || defaultAvatar;
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId);
  };

  // Create notifications
  const createTaskNotifications = async (taskTitle: string, assignedTo: string) => {
    try {
      if (assignedTo === ENTIRE_TEAM) {
        const notifications = teamMembers.map(member => ({
          user_id: member.user_id,
          title: 'New Team Task',
          message: `New Team-Wide Task: ${taskTitle}`,
          type: 'task',
          link: '/tasks',
        }));
        await supabase.from('notifications').insert(notifications);
      } else if (assignedTo) {
        await supabase.from('notifications').insert({
          user_id: assignedTo,
          title: 'Task Assigned',
          message: `New Task Assigned to You: ${taskTitle}`,
          type: 'task',
          link: '/tasks',
        });
      }
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !user) return;
    const trimmedTitle = newTask.title.trim();
    const trimmedDescription = newTask.description.trim();

    if (trimmedTitle.length > MAX_TITLE_LENGTH || trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      toast({ title: 'Input too long', variant: 'destructive' });
      return;
    }

    const assignedToValue = newTask.assignedTo === ENTIRE_TEAM ? null : newTask.assignedTo || null;

    const { error } = await supabase.from('tasks').insert({
      title: trimmedTitle,
      description: trimmedDescription || null,
      priority: newTask.priority,
      status: 'backlog',
      created_by: user.id,
      created_by_name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
      assigned_to: assignedToValue,
      project_id: newTask.projectId || null,
    });

    if (error) {
      toast({ title: 'Failed to create task', description: error.message, variant: 'destructive' });
    } else {
      if (newTask.assignedTo) await createTaskNotifications(trimmedTitle, newTask.assignedTo);
      toast({ title: 'Task created!' });
      setNewTask({ title: '', description: '', priority: 'normal', assignedTo: '', projectId: '' });
      setShowAddModal(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name.trim() || !user) return;

    const { error } = await supabase.from('projects').insert({
      name: newProject.name.trim(),
      icon: newProject.icon,
      color: newProject.color,
      description: newProject.description.trim() || null,
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Failed to create project', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Project created!' });
      setNewProject({ name: '', icon: '📁', color: '#00d2ff', description: '' });
      setShowProjectModal(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) {
      toast({ title: 'Failed to update task', description: error.message, variant: 'destructive' });
    } else if (newStatus === 'verified') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      toast({ title: '🎉 Task Verified!', description: 'Great work!' });
    } else if (newStatus === 'pending-verification') {
      toast({ title: '✅ Marked as completed — awaiting verification.' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) toast({ title: 'Failed to delete task', description: error.message, variant: 'destructive' });
  };

  const activeProject = activeProjectFilter && activeProjectFilter !== 'unassigned'
    ? projects.find(p => p.id === activeProjectFilter)
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{ left: `${Math.random() * 100}%`, backgroundColor: ['#00d2ff', '#ff3b30', '#34c759', '#ffcc00', '#af52de'][Math.floor(Math.random() * 5)] }}
                initial={{ top: '-10%', rotate: 0 }}
                animate={{ top: '110%', rotate: Math.random() * 720 - 360, x: Math.random() * 200 - 100 }}
                transition={{ duration: 2 + Math.random() * 2, ease: 'easeOut', delay: Math.random() * 0.5 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.snappy} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron']">Task Matrix</h1>
          <p className="text-muted-foreground text-sm">
            {activeProject ? `${activeProject.icon} ${activeProject.name}` : 'All Projects'} — {getProjectProgress()}% Verified
          </p>
        </div>

        {!roleLoading && isFounder && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowProjectModal(true)} className="gap-1.5">
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
            <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        )}
      </motion.div>

      {/* Project Filters */}
      {projects.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-cyber">
          <button
            onClick={() => setActiveProjectFilter(null)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
              !activeProjectFilter
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-card/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Filter className="w-3 h-3" />
            All
          </button>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setActiveProjectFilter(activeProjectFilter === project.id ? null : project.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                activeProjectFilter === project.id
                  ? "border-primary/50 text-primary"
                  : "bg-card/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
              style={activeProjectFilter === project.id ? { backgroundColor: `${project.color}20` } : {}}
            >
              <span>{project.icon}</span>
              {project.name}
            </button>
          ))}
          <button
            onClick={() => setActiveProjectFilter(activeProjectFilter === 'unassigned' ? null : 'unassigned')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
              activeProjectFilter === 'unassigned'
                ? "bg-muted border-border text-foreground"
                : "bg-card/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            📌 Unassigned
          </button>
        </motion.div>
      )}

      {/* Overall Progress Bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {activeProject ? `${activeProject.icon} ${activeProject.name}` : 'Overall'} Progress
          </span>
          <span className="text-sm font-bold text-primary">{getProjectProgress()}%</span>
        </div>
        <Progress value={getProjectProgress()} className="h-2" />
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
          {columns.map(col => (
            <div key={col.id} className="flex items-center gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full", col.dotColor)} />
              <span>{col.label}: {getTasksByStatus(col.id).length}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {columns.map((column, colIndex) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springPresets.snappy, delay: colIndex * 0.08 }}
              className={cn(
                "rounded-2xl p-3 sm:p-4 min-h-[300px] bg-gradient-to-b backdrop-blur-sm border border-border/50",
                column.color
              )}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-primary'); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-primary'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-primary');
                if (draggingTask) { handleStatusChange(draggingTask.id, column.id); setDraggingTask(null); }
              }}
            >
              {/* Column Header with Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-semibold text-xs uppercase tracking-wider">{column.label}</h3>
                  <span className="text-[10px] text-muted-foreground bg-card/50 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", column.dotColor)}
                    initial={{ width: 0 }}
                    animate={{ width: `${getColumnProgress(column.id)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {columnTasks.map((task) => {
                    const project = getProjectName(task.project_id);
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={springPresets.snappy}
                        draggable={!isRestricted}
                        onDragStart={() => !isRestricted && setDraggingTask(task)}
                        onDragEnd={() => setDraggingTask(null)}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "bg-card rounded-xl p-3 border-l-4 transition-all border border-transparent hover:border-primary/30",
                          priorityConfig[task.priority].border,
                          isRestricted ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                        )}
                      >
                        {/* Project tag */}
                        {project && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className="text-[10px]">{project.icon}</span>
                            <span className="text-[10px] font-medium text-muted-foreground truncate">{project.name}</span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            {task.description && (
                              <div className="relative mt-1">
                                {isRestricted ? (
                                  <div className="relative">
                                    <p className="text-xs text-muted-foreground line-clamp-2 blur-sm select-none">{task.description}</p>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 bg-background/50 px-2 py-0.5 rounded">
                                        <Lock className="w-3 h-3" />
                                        <span>Restricted</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                                )}
                              </div>
                            )}
                          </div>
                          {isFounder && (
                            <button onClick={() => handleDeleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Priority + Assignee row */}
                        <div className="flex items-center justify-between mt-2.5 gap-2">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", priorityConfig[task.priority].bg)}>
                            {priorityConfig[task.priority].label} {task.priority}
                          </span>

                          <div className="flex items-center gap-1.5 min-w-0">
                            {task.assigned_to ? (
                              <div className="flex items-center gap-1 min-w-0">
                                <img
                                  src={getAssigneeAvatar(task.assigned_to) || defaultAvatar}
                                  alt=""
                                  className="w-5 h-5 rounded-full border border-border flex-shrink-0"
                                />
                                <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                                  {getAssigneeName(task.assigned_to)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                <span className="text-[10px] text-primary font-medium">Team</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Mark Completed / Verify */}
                        {!isRestricted && (
                          <div className="mt-2.5">
                            {/* Any member can mark their task as completed when in QC */}
                            {task.status === 'quality-check' && (task.assigned_to === user?.id || !task.assigned_to) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                                onClick={() => handleStatusChange(task.id, 'pending-verification')}
                              >
                                <CheckCircle2 className="w-3 h-3" /> Mark as Completed
                              </Button>
                            )}
                            {/* Founders verify pending tasks */}
                            {task.status === 'pending-verification' && isFounder && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => handleStatusChange(task.id, 'verified')}
                              >
                                <ShieldCheck className="w-3 h-3" /> Verify & Approve
                              </Button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground/50">
                    <p className="text-xs">No tasks</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="glass-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={newTask.title} onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))} placeholder="Enter task title..." className="bg-background/50" maxLength={MAX_TITLE_LENGTH} />
              <span className="text-xs text-muted-foreground">{newTask.title.length}/{MAX_TITLE_LENGTH}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={newTask.description} onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))} placeholder="Enter task description..." className="bg-background/50 min-h-[80px]" maxLength={MAX_DESCRIPTION_LENGTH} />
              <span className="text-xs text-muted-foreground">{newTask.description.length}/{MAX_DESCRIPTION_LENGTH}</span>
            </div>

            {/* Project Select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Project</label>
              <Select value={newTask.projectId} onValueChange={(value) => setNewTask(prev => ({ ...prev, projectId: value }))}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span>{project.icon}</span>
                        <span>{project.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as Task['priority'] }))}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="normal">🔵 Normal</SelectItem>
                  <SelectItem value="high">🟡 High</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Assign To
              </label>
              <Select value={newTask.assignedTo} onValueChange={(value) => setNewTask(prev => ({ ...prev, assignedTo: value }))}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ENTIRE_TEAM}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Entire Team</span>
                    </div>
                  </SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <div className="flex items-center gap-2">
                        <img src={member.avatar_url || defaultAvatar} alt="" className="w-5 h-5 rounded-full" />
                        <span>{member.display_name || member.email?.split('@')[0] || 'Unknown'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddTask} className="flex-1">Create Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Project Name</label>
              <Input value={newProject.name} onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. RESQ+" className="bg-background/50" maxLength={100} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Icon</label>
              <div className="flex flex-wrap gap-2">
                {projectIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewProject(prev => ({ ...prev, icon }))}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-lg border transition-all",
                      newProject.icon === icon ? "border-primary bg-primary/20 scale-110" : "border-border/50 bg-card/50 hover:border-border"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {['#00d2ff', '#34c759', '#ff3b30', '#ffcc00', '#af52de', '#ff9500', '#5ac8fa', '#ff2d55'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewProject(prev => ({ ...prev, color }))}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      newProject.color === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={newProject.description} onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description..." className="bg-background/50 min-h-[60px]" maxLength={500} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowProjectModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleAddProject} className="flex-1">Create Project</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
