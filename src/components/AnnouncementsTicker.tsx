import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  is_urgent: boolean | null;
}

export function AnnouncementsTicker() {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch upcoming events and recent notices
      const [{ data: events }, { data: notices }] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, description, start_date, is_urgent')
          .gte('end_date', today)
          .order('start_date', { ascending: true })
          .limit(5),
        supabase
          .from('notice_board')
          .select('title')
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const items: string[] = [];
      
      (events || []).forEach((e: Event) => {
        const prefix = e.is_urgent ? '🚨 ' : '📢 ';
        items.push(`${prefix}${e.title}${e.description ? ' — ' + e.description : ''}`);
      });
      
      (notices || []).forEach(n => {
        items.push(`📋 ${n.title}`);
      });

      if (items.length === 0) {
        items.push("Welcome to ARTFIQ Work Hub! Stay updated with announcements here.");
      }

      setAnnouncements(items);
    };

    fetchAnnouncements();

    const channel = supabase
      .channel('ticker-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchAnnouncements())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notice_board' }, () => fetchAnnouncements())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (announcements.length === 0) return null;

  const tickerText = announcements.join('   •   ');

  return (
    <div className="fixed top-14 sm:top-16 left-0 right-0 z-30 bg-primary/10 backdrop-blur-md border-b border-primary/20 overflow-hidden h-7 flex items-center">
      <div className="flex items-center gap-2 px-3 flex-shrink-0">
        <Megaphone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      </div>
      <div className="overflow-hidden flex-1 relative">
        <motion.div
          className="whitespace-nowrap text-xs font-medium text-primary/90"
          animate={{ x: ['100%', '-100%'] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: Math.max(tickerText.length * 0.15, 15),
              ease: 'linear',
            },
          }}
        >
          {tickerText}
        </motion.div>
      </div>
    </div>
  );
}
