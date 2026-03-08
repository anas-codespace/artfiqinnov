import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'ceo' | 'cto' | 'team';

interface UserRoleData {
  role: AppRole | null;
  isFounder: boolean;
  roleLabel: string;
  isLoading: boolean;
}

export function useUserRole(): UserRoleData {
  const { user, isGuest } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user || isGuest) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching role:', error);
        }

        // Cast the role to AppRole type
        if (data?.role) {
          setRole(data.role as AppRole);
        } else {
          // Default to team if no role found
          setRole('team');
        }
      } catch (error) {
        console.error('Error fetching role:', error);
        setRole('team');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const getRoleLabel = (role: AppRole | null): string => {
    switch (role) {
      case 'ceo':
        return 'CEO';
      case 'cto':
        return 'CTO';
      case 'team':
        return 'Team';
      default:
        return '';
    }
  };

  return {
    role,
    isFounder: role === 'ceo' || role === 'cto',
    roleLabel: getRoleLabel(role),
    isLoading,
  };
}
