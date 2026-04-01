import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { springPresets } from '@/components/ui/spring-config';
import defaultAvatarImg from '@/assets/default-avatar.webp';

interface StarData {
  id: string;
  user_id: string;
  reason: string | null;
  display_name: string | null;
  avatar_url: string | null;
  posting: string | null;
}

export function StarOfTheWeek() {
  const [star, setStar] = useState<StarData | null>(null);

  useEffect(() => {
    const fetchStar = async () => {
      const { data } = await supabase
        .from('star_of_week')
        .select('id, user_id, reason')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, posting')
        .eq('user_id', data.user_id)
        .single();

      setStar({
        ...data,
        display_name: profile?.display_name || 'Team Member',
        avatar_url: profile?.avatar_url || null,
        posting: profile?.posting || null,
      });
    };

    fetchStar();

    const channel = supabase
      .channel('star-of-week')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'star_of_week' }, () => fetchStar())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!star) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.snappy}
      className="glass-card rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-amber-400">⭐ Star of the Week</h3>
        </div>

        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative flex-shrink-0"
          >
            <img
              src={star.avatar_url || defaultAvatarImg}
              alt={star.display_name || 'Star'}
              className="w-16 h-16 rounded-full border-2 border-amber-500/50 object-cover"
            />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </motion.div>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-base truncate">{star.display_name}</p>
            {star.posting && (
              <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-semibold">
                {star.posting}
              </span>
            )}
            {star.reason && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{star.reason}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
