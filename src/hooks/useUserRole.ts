import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DisplayRole } from '@/components/ui/role-badge';

export type AppRole = 'ceo' | 'cto' | 'team';

interface UserRoleData {
  role: AppRole | null;
  /** The effective display role factoring in access_status */
  displayRole: DisplayRole | null;
  isFounder: boolean;
  roleLabel: string;
  isLoading: boolean;
}

export function useUserRole(): UserRoleData {
  const { user, profile, isGuest } = useAuth();
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

        if (data?.role) {
          setRole(data.role as AppRole);
        } else {
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
  }, [user, isGuest]);

  // Compute the display role: founders always show their role,
  // non-founders show 'visitor' unless access_status is 'approved_member'
  const getDisplayRole = (): DisplayRole | null => {
    if (!role) return null;
    if (role === 'ceo' || role === 'cto') return role;
    // For 'team' role, check access_status
    const accessStatus = profile?.access_status;
    if (accessStatus === 'approved_member') return 'team';
    return 'visitor';
  };

  const displayRole = getDisplayRole();

  const getRoleLabel = (r: DisplayRole | null): string => {
    switch (r) {
      case 'ceo': return 'CEO';
      case 'cto': return 'MD';
      case 'team': return 'Team Member';
      case 'visitor': return 'Visitor';
      default: return '';
    }
  };

  return {
    role,
    displayRole,
    isFounder: role === 'ceo' || role === 'cto',
    roleLabel: getRoleLabel(displayRole),
    isLoading,
  };
}
