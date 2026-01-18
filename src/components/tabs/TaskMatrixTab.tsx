import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, User, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
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

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'backlog' | 'in-dev' | 'quality-check' | 'deployed';
  assigned_to: string | null;
  created_by: string;
  created_by_name: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

const columns = [
  { id: 'backlog', label: 'Backlog', color: 'from-slate-500/20 to-slate-600/10' },
  { id: 'in-dev', label: 'In-Dev', color: 'from-blue-500/20 to-blue-600/10' },
  { id: 'quality-check', label: 'Quality Check', color: 'from-amber-500/20 to-amber-600/10' },
  { id: 'deployed', label: 'Deployed', color: 'from-emerald-500/20 to-emerald-600/10' },
] as const;

const priorityColors = {
  low: 'border-l-slate-500',
  normal: 'border-l-primary',
  high: 'border-l-amber-500',
  urgent: 'border-l-destructive',
};

// Validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

// Special value for assigning to entire team
const ENTIRE_TEAM = 'ALL';

export function TaskMatrixTab() {
  const { user, profile } = useAuth();
  const { isFounder, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    priority: 'normal' as Task['priority'],
    assignedTo: '' as string
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  // Fetch tasks and team members
  useEffect(() => {
    const fetchData = async () => {
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      } else {
        setTasks((tasksData as Task[]) || []);
      }

      // Fetch team members from profiles_safe view
      const { data: membersData, error: membersError } = await supabase
        .from('profiles_safe')
        .select('user_id, display_name, avatar_url, email')
        .order('created_at', { ascending: true });

      if (membersError) {
        console.error('Error fetching team members:', membersError);
      } else {
        setTeamMembers((membersData as TeamMember[]) || []);
      }

      setIsLoading(false);
    };

    fetchData();

    // Real-time subscription for tasks
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [...prev, payload.new as Task]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Create notifications for assigned users
  const createTaskNotifications = async (taskTitle: string, assignedTo: string) => {
    try {
      if (assignedTo === ENTIRE_TEAM) {
        // Notify all team members
        const notifications = teamMembers.map(member => ({
          user_id: member.user_id,
          title: 'New Team Task',
          message: `New Team-Wide Task: ${taskTitle}`,
          type: 'task',
          link: '/tasks',
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) {
          console.error('Error creating team notifications:', error);
        }
      } else if (assignedTo) {
        // Notify specific user
        const { error } = await supabase.from('notifications').insert({
          user_id: assignedTo,
          title: 'Task Assigned',
          message: `New Task Assigned to You: ${taskTitle}`,
          type: 'task',
          link: '/tasks',
        });
        if (error) {
          console.error('Error creating notification:', error);
        }
      }
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !user) return;

    // Input validation
    const trimmedTitle = newTask.title.trim();
    const trimmedDescription = newTask.description.trim();
    
    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      toast({
        title: 'Title too long',
        description: `Maximum ${MAX_TITLE_LENGTH} characters allowed`,
        variant: 'destructive',
      });
      return;
    }
    
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      toast({
        title: 'Description too long',
        description: `Maximum ${MAX_DESCRIPTION_LENGTH} characters allowed`,
        variant: 'destructive',
      });
      return;
    }

    // Determine assigned_to value
    const assignedToValue = newTask.assignedTo === ENTIRE_TEAM 
      ? null  // null means entire team (we'll use a different field or convention)
      : newTask.assignedTo || null;

    const { error } = await supabase.from('tasks').insert({
      title: trimmedTitle,
      description: trimmedDescription || null,
      priority: newTask.priority,
      status: 'backlog',
      created_by: user.id,
      created_by_name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
      assigned_to: assignedToValue,
    });

    if (error) {
      toast({
        title: 'Failed to create task',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Create notifications for assigned users
      if (newTask.assignedTo) {
        await createTaskNotifications(trimmedTitle, newTask.assignedTo);
      }

      toast({ title: 'Task created!' });
      setNewTask({ title: '', description: '', priority: 'normal', assignedTo: '' });
      setShowAddModal(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      toast({
        title: 'Failed to update task',
        description: error.message,
        variant: 'destructive',
      });
    } else if (newStatus === 'deployed') {
      // Trigger confetti celebration!
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      toast({ title: '🎉 Task Deployed!', description: 'Great work!' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      toast({
        title: 'Failed to delete task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter(t => t.status === status);
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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Confetti celebration */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#00d2ff', '#ff3b30', '#34c759', '#ffcc00', '#af52de'][Math.floor(Math.random() * 5)],
                }}
                initial={{ top: '-10%', rotate: 0 }}
                animate={{
                  top: '110%',
                  rotate: Math.random() * 720 - 360,
                  x: Math.random() * 200 - 100,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  ease: 'easeOut',
                  delay: Math.random() * 0.5,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springPresets.snappy}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Task Matrix</h1>
          <p className="text-muted-foreground">
            {isFounder 
              ? 'Create tasks and assign them to your team' 
              : 'Drag tasks between columns to update status'}
          </p>
        </div>
        
        {/* Only show Add Task button for CEO/CTO */}
        {!roleLoading && isFounder && (
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        )}
      </motion.div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column, colIndex) => (
          <motion.div
            key={column.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springPresets.snappy, delay: colIndex * 0.1 }}
            className={cn(
              "rounded-2xl p-4 min-h-[400px] bg-gradient-to-b backdrop-blur-sm border border-border/50",
              column.color
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('ring-2', 'ring-primary');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('ring-2', 'ring-primary');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('ring-2', 'ring-primary');
              if (draggingTask) {
                handleStatusChange(draggingTask.id, column.id);
                setDraggingTask(null);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider">{column.label}</h3>
              <span className="text-xs text-muted-foreground bg-card/50 px-2 py-1 rounded-full">
                {getTasksByStatus(column.id).length}
              </span>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {getTasksByStatus(column.id).map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={springPresets.snappy}
                    draggable
                    onDragStart={() => setDraggingTask(task)}
                    onDragEnd={() => setDraggingTask(null)}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: '0 0 20px hsl(187 100% 50% / 0.3)',
                    }}
                    className={cn(
                      "bg-[#161616] rounded-xl p-4 cursor-grab active:cursor-grabbing border-l-4 transition-all",
                      priorityColors[task.priority],
                      "hover:border-primary/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                      {/* Only show delete for founders */}
                      {isFounder && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    {/* Task metadata */}
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span className="truncate">{task.created_by_name}</span>
                      </div>
                      
                      {/* Show assignee */}
                      <div className="flex items-center gap-1">
                        {task.assigned_to ? (
                          <>
                            <img 
                              src={getAssigneeAvatar(task.assigned_to) || defaultAvatar} 
                              alt="" 
                              className="w-4 h-4 rounded-full"
                            />
                            <span className="truncate max-w-[60px]">
                              {getAssigneeName(task.assigned_to)}
                            </span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3 h-3 text-primary" />
                            <span className="text-primary">Team</span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Task Modal - Only accessible by founders */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title..."
                className="bg-background/50"
                maxLength={MAX_TITLE_LENGTH}
              />
              <span className="text-xs text-muted-foreground">{newTask.title.length}/{MAX_TITLE_LENGTH}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description..."
                className="bg-background/50 min-h-[100px]"
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <span className="text-xs text-muted-foreground">{newTask.description.length}/{MAX_DESCRIPTION_LENGTH}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={newTask.priority}
                onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as Task['priority'] }))}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assign To Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Assign To
              </label>
              <Select
                value={newTask.assignedTo}
                onValueChange={(value) => setNewTask(prev => ({ ...prev, assignedTo: value }))}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  {/* Entire Team Option */}
                  <SelectItem value={ENTIRE_TEAM}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Entire Team</span>
                    </div>
                  </SelectItem>
                  
                  {/* Individual Team Members */}
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={member.avatar_url || defaultAvatar} 
                          alt="" 
                          className="w-5 h-5 rounded-full"
                        />
                        <span>{member.display_name || member.email?.split('@')[0] || 'Unknown'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newTask.assignedTo === ENTIRE_TEAM 
                  ? 'All team members will be notified' 
                  : newTask.assignedTo 
                    ? 'This user will be notified'
                    : 'Select who should work on this task'}
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddTask} className="flex-1">
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
