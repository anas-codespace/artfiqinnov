import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export type AccessStatus = 'visitor' | 'pending' | 'approved_member';

interface UserStatusData {
  accessStatus: AccessStatus;
  isVisitor: boolean;
  isPending: boolean;
  isMember: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  requestAccess: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

const CEO_EMAIL = 'sulaiman.artfiqceo@gmail.com';
const CTO_EMAIL = 'anas.md.artfiq@gmail.com';

export function useUserStatus(): UserStatusData {
  const { user, profile, isGuest } = useAuth();
  const { isFounder, isLoading: roleLoading } = useUserRole();
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('visitor');
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (isGuest) {
      setAccessStatus('visitor');
      setIsLoading(false);
      return;
    }
    if (!user) {
      setAccessStatus('visitor');
      setIsLoading(false);
      return;
    }

    try {
      // Auto-approve founders on login
      const isFounderEmail = user.email === CEO_EMAIL || user.email === CTO_EMAIL;
      
      if (isFounderEmail) {
        // Check if already approved, if not, update
        const { data } = await supabase
          .from('profiles')
          .select('access_status')
          .eq('user_id', user.id)
          .single();

        if (data?.access_status !== 'approved_member') {
          await supabase
            .from('profiles')
            .update({ access_status: 'approved_member' })
            .eq('user_id', user.id);
        }
        
        setAccessStatus('approved_member');
      } else {
        // Fetch current status
        const { data, error } = await supabase
          .from('profiles')
          .select('access_status')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching access status:', error);
        }

        setAccessStatus((data?.access_status as AccessStatus) || 'visitor');
      }
    } catch (error) {
      console.error('Error in fetchStatus:', error);
      setAccessStatus('visitor');
    } finally {
      setIsLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Also refresh when profile changes
  useEffect(() => {
    if (profile && profile.access_status) {
      setAccessStatus(profile.access_status);
    }
  }, [profile]);

  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (!user || !profile) return false;

    try {
      // Update own status to pending
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ access_status: 'pending' })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Get founder user IDs
      const { data: founders } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['ceo', 'cto']);

      if (founders && founders.length > 0) {
        // Create notifications for each founder
        // Format message to include email in parentheses for extraction
        const displayName = profile.display_name || user.email?.split('@')[0] || 'Unknown';
        const notifications = founders.map(f => ({
          user_id: f.user_id,
          title: 'Access Request',
          message: `${displayName} (${user.email}) is requesting team access.`,
          type: 'access_request',
          link: '/settings',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setAccessStatus('pending');
      return true;
    } catch (error) {
      console.error('Error requesting access:', error);
      return false;
    }
  }, [user, profile]);

  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return {
    accessStatus,
    isVisitor: accessStatus === 'visitor',
    isPending: accessStatus === 'pending',
    isMember: accessStatus === 'approved_member',
    isAdmin: isFounder || role === 'admin',
    isLoading: isLoading || roleLoading,
    requestAccess,
    refreshStatus,
  };
}
