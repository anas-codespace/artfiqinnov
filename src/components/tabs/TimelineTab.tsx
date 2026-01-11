import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

export function TimelineTab() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isUrgent: false,
  });

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents((data as CalendarEvent[]) || []);
      }
      setIsLoading(false);
    };

    fetchEvents();

    // Real-time subscription
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEvents(prev => [...prev, payload.new as CalendarEvent]);
          } else if (payload.eventType === 'UPDATE') {
            setEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new as CalendarEvent : e));
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDay = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
    return events.filter(event => {
      const start = event.start_date;
      const end = event.end_date;
      return dateStr >= start && dateStr <= end;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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

    // Input validation
    const trimmedTitle = newEvent.title.trim();
    const trimmedDescription = newEvent.description.trim();
    
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
      toast({
        title: 'Failed to create event',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Event created!' });
      setNewEvent({ title: '', description: '', startDate: '', endDate: '', isUrgent: false });
      setShowAddModal(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase.from('events').delete().eq('id', eventId);

    if (error) {
      toast({
        title: 'Failed to delete event',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springPresets.snappy}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Timeline</h1>
          <p className="text-muted-foreground">Team calendar and events</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Event
        </Button>
      </motion.div>

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPresets.snappy, delay: 0.1 }}
        className="glass-card rounded-2xl p-6"
      >
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-semibold">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DAYS.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayEvents = getEventsForDay(day);
            const hasUrgent = dayEvents.some(e => e.is_urgent);
            const today = isToday(day);

            return (
              <motion.button
                key={day}
                onClick={() => handleDayClick(day)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={springPresets.button}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-start p-2 relative transition-all border border-transparent",
                  "hover:bg-card/80 hover:border-primary/30",
                  today && "ring-2 ring-primary animate-pulse-glow"
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  today && "text-primary"
                )}>
                  {day}
                </span>
                
                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 justify-center">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          event.is_urgent 
                            ? "bg-destructive shadow-[0_0_10px_#ff3b30]" 
                            : "bg-primary shadow-[0_0_10px_#00d2ff]"
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Today indicator */}
                {today && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-primary"
                    animate={{ 
                      boxShadow: ['0 0 10px hsl(187 100% 50% / 0.3)', '0 0 20px hsl(187 100% 50% / 0.5)', '0 0 10px hsl(187 100% 50% / 0.3)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Events List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPresets.snappy, delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Upcoming Events
        </h3>
        
        <AnimatePresence mode="popLayout">
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-xl p-8 text-center"
            >
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No events scheduled</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ ...springPresets.snappy, delay: index * 0.05 }}
                  className={cn(
                    "glass-card rounded-xl p-4 flex items-center gap-4 group",
                    event.is_urgent 
                      ? "border-l-4 border-l-destructive shadow-[0_0_10px_hsl(4_90%_58%/0.2)]" 
                      : "border-l-4 border-l-primary shadow-[0_0_10px_hsl(187_100%_50%/0.1)]"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{event.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.start_date).toLocaleDateString()} 
                      {event.start_date !== event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Add Event Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Event title..."
                className="bg-background/50"
                maxLength={MAX_TITLE_LENGTH}
              />
              <span className="text-xs text-muted-foreground">{newEvent.title.length}/{MAX_TITLE_LENGTH}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
                className="bg-background/50 min-h-[80px]"
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <span className="text-xs text-muted-foreground">{newEvent.description.length}/{MAX_DESCRIPTION_LENGTH}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={newEvent.startDate}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={newEvent.endDate}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Urgent Event</label>
              <Switch
                checked={newEvent.isUrgent}
                onCheckedChange={(checked) => setNewEvent(prev => ({ ...prev, isUrgent: checked }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddEvent} className="flex-1">
                Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
