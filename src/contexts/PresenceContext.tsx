import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceContextType {
  onlineUserIds: string[];
  isUserOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: [],
  isUserOnline: () => false,
});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setOnlineUserIds([]);
      return;
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids: string[] = [];
        for (const key of Object.keys(state)) {
          ids.push(key);
        }
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Update last_seen in user_presence table for fallback
    const updatePresenceTable = async () => {
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        is_online: true,
        is_typing: false,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    };
    updatePresenceTable();

    return () => {
      // Mark offline in DB
      supabase.from('user_presence').update({
        is_online: false,
        is_typing: false,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id).then(() => {});

      supabase.removeChannel(channel);
    };
  }, [user]);

  const isUserOnline = useCallback(
    (userId: string) => onlineUserIds.includes(userId),
    [onlineUserIds]
  );

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isUserOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
