import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Lock, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from '@/contexts/PresenceContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { springPresets } from '@/components/ui/spring-config';
import { useUserStatus } from '@/hooks/useUserStatus';
import defaultAvatar from '@/assets/default-avatar.webp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_urgent: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

interface TeamMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  department: string | null;
}

// Presence interface no longer needed - using global PresenceContext

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DEPT_FILTERS = ['All', 'TD', 'MO', 'CM', 'ES'];
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

export function TimelineTab() {
  const { isUserOnline } = usePresence();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { isMember, isVisitor, isPending } = useUserStatus();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [deptFilter, setDeptFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showFutureWarning, setShowFutureWarning] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isUrgent: false,
  });

  const isRestricted = isVisitor || isPending;

  useEffect(() => {
    const fetchData = async () => {
      const [eventsRes, membersRes] = await Promise.all([
        supabase.from('events').select('*').order('start_date', { ascending: true }),
        supabase.from('profiles_safe').select('user_id, display_name, avatar_url, department'),
      ]);
      if (!eventsRes.error) setEvents((eventsRes.data as CalendarEvent[]) || []);
      if (!membersRes.error) setTeamMembers((membersRes.data as unknown as TeamMember[]) || []);
      setIsLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel('timeline-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
        if (payload.eventType === 'INSERT') setEvents(prev => [...prev, payload.new as CalendarEvent]);
        else if (payload.eventType === 'UPDATE') setEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new as CalendarEvent : e));
        else if (payload.eventType === 'DELETE') setEvents(prev => prev.filter(e => e.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Use global presence context instead of DB-based presence

  const filteredMembers = deptFilter === 'All'
    ? teamMembers
    : teamMembers.filter(m => m.department === deptFilter);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
    return days;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  const getEventsForDay = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return events.filter(event => {
      const inRange = dateStr >= event.start_date && dateStr <= event.end_date;
      if (isRestricted && event.start_date > today) return false;
      return inRange;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setShowFutureWarning(false);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (isRestricted && nextMonth > new Date()) setShowFutureWarning(true);
    else setShowFutureWarning(false);
    setCurrentDate(nextMonth);
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    const dateStr = clickedDate.toISOString().split('T')[0];
    setNewEvent(prev => ({ ...prev, startDate: dateStr, endDate: dateStr }));
    setShowAddModal(true);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.startDate || !newEvent.endDate || !user) return;
    const trimmedTitle = newEvent.title.trim();
    const trimmedDescription = newEvent.description.trim();
    if (trimmedTitle.length > MAX_TITLE_LENGTH || trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      toast({ title: 'Input too long', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('events').insert({
      title: trimmedTitle,
      description: trimmedDescription || null,
      start_date: newEvent.startDate,
      end_date: newEvent.endDate,
      is_urgent: newEvent.isUrgent,
      created_by: user.id,
      created_by_name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
    });
    if (error) {
      toast({ title: 'Failed to create event', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Event created!' });
      setNewEvent({ title: '', description: '', startDate: '', endDate: '', isUrgent: false });
      setShowAddModal(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) toast({ title: 'Failed to delete event', description: error.message, variant: 'destructive' });
  };

  const days = getDaysInMonth(currentDate);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.snappy} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Orbitron']">Timeline</h1>
          <p className="text-muted-foreground text-sm">Team calendar & availability</p>
        </div>
        {isMember && (
          <Button onClick={() => setShowAddModal(true)} className="gap-2" size="sm">
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        )}
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-4 sm:p-6 flex-1 relative overflow-hidden"
        >
          {/* Future warning overlay */}
          <AnimatePresence>
            {showFutureWarning && isRestricted && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 backdrop-blur-md bg-background/60 flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-full bg-destructive/20 border border-destructive/30">
                  <Lock className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-bold text-destructive">CLASSIFIED</h3>
                <p className="text-muted-foreground text-center max-w-xs">Future operations restricted to approved members.</p>
                <Button variant="outline" size="sm" onClick={() => { setShowFutureWarning(false); setCurrentDate(new Date()); }}>Return to Current Month</Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-5 h-5" /></Button>
            <h2 className="text-lg font-semibold">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="w-5 h-5" /></Button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {days.map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} className="aspect-square" />;
              const dayEvents = getEventsForDay(day);
              const today = isToday(day);
              return (
                <motion.button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-start p-1 sm:p-2 relative transition-all border border-transparent",
                    "hover:bg-card/80 hover:border-primary/30",
                    today && "ring-2 ring-primary"
                  )}
                >
                  <span className={cn("text-xs sm:text-sm font-medium", today && "text-primary")}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={cn("w-1.5 h-1.5 rounded-full", event.is_urgent ? "bg-destructive" : "bg-primary")}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Availability Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-4 lg:w-72"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Team Availability</h3>
          </div>

          {/* Department Filters */}
          <div className="flex flex-wrap gap-1 mb-3">
            {DEPT_FILTERS.map(d => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-medium border transition-all",
                  deptFilter === d ? "bg-primary/20 border-primary/50 text-primary" : "bg-card/50 border-border/50 text-muted-foreground"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredMembers.length > 0 ? filteredMembers.map(member => {
              const online = getPresence(member.user_id);
              return (
                <div key={member.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card/50 transition-colors">
                  <div className="relative">
                    <img
                      src={member.avatar_url || defaultAvatar}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                      online ? "bg-emerald-500" : "bg-destructive"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{member.display_name || 'Unknown'}</p>
                    {member.department && (
                      <p className="text-[10px] text-muted-foreground">{member.department}</p>
                    )}
                  </div>
                  <span className={cn("text-[10px] font-medium", online ? "text-emerald-400" : "text-muted-foreground")}>
                    {online ? 'Online' : 'Offline'}
                  </span>
                </div>
              );
            }) : (
              <p className="text-xs text-muted-foreground text-center py-4">No team members found</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Events List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Upcoming Events
        </h3>
        <AnimatePresence mode="popLayout">
          {events.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No events scheduled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "glass-card rounded-xl p-4 flex items-center gap-4 group",
                    event.is_urgent ? "border-l-4 border-l-destructive" : "border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{event.title}</p>
                    {event.description && <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(event.start_date).toLocaleDateString()}
                      {event.start_date !== event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
                      {' · '}{event.created_by_name}
                    </p>
                  </div>
                  {isMember && (
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Add Event Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={newEvent.title} onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))} placeholder="Event title..." className="bg-background/50" maxLength={MAX_TITLE_LENGTH} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={newEvent.description} onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))} placeholder="Event description..." className="bg-background/50 min-h-[80px]" maxLength={MAX_DESCRIPTION_LENGTH} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={newEvent.startDate} onChange={e => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))} className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={newEvent.endDate} onChange={e => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))} className="bg-background/50" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={newEvent.isUrgent} onCheckedChange={v => setNewEvent(prev => ({ ...prev, isUrgent: v }))} />
              <label className="text-sm">Mark as urgent</label>
            </div>
            <Button onClick={handleAddEvent} disabled={!newEvent.title.trim() || !newEvent.startDate || !newEvent.endDate} className="w-full">Create Event</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
