import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Upload, Megaphone, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { springPresets } from '@/components/ui/spring-config';

interface FeedItem {
  id: string;
  actor_name: string;
  action_type: string;
  description: string;
  created_at: string;
}

const actionIcons: Record<string, typeof Upload> = {
  file_upload: Upload,
  notice_posted: Megaphone,
  leave_approved: CheckCircle2,
  punch_in: Clock,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const fetchFeed = async () => {
      const { data } = await supabase
        .from('activity_feed')
        .select('id, actor_name, action_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(15);
      setItems(data || []);
    };

    fetchFeed();

    const channel = supabase
      .channel('activity-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, (payload) => {
        const newItem = payload.new as FeedItem;
        setItems(prev => [newItem, ...prev].slice(0, 15));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.snappy}
      className="glass-card rounded-2xl p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Recent Activity</h3>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const Icon = actionIcons[item.action_type] || Activity;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-medium">{item.actor_name}</span>{' '}
                    <span className="text-muted-foreground">{item.description}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item.created_at)}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
