import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, Shield, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import defaultAvatar from '@/assets/default-avatar.webp';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  access_status: string | null;
}

interface AdminDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminDashboard({ open, onOpenChange }: AdminDashboardProps) {
  const { isFounder, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, email, avatar_url, access_status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open && isFounder) {
      fetchUsers();
    }
  }, [open, isFounder]);

  const updateUserStatus = async (userId: string, newStatus: string) => {
    setActionLoading(userId);
    
    const { error } = await supabase
      .from('profiles')
      .update({ access_status: newStatus })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: newStatus === 'approved_member' 
          ? 'User has been approved!' 
          : 'User access has been revoked.',
      });
      // Refresh the list
      await fetchUsers();
    }
    
    setActionLoading(null);
  };

  const approvedMembers = users.filter(u => u.access_status === 'approved_member');
  const visitorsAndPending = users.filter(u => u.access_status === 'visitor' || u.access_status === 'pending');

  // Don't render if not a founder
  if (!roleLoading && !isFounder) {
    return null;
  }

  const UserCard = ({ user, showApprove = false, showRemove = false }: { 
    user: UserProfile; 
    showApprove?: boolean;
    showRemove?: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
    >
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user.avatar_url || defaultAvatar} alt={user.display_name || 'User'} />
          <AvatarFallback>{(user.display_name || 'U')[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{user.display_name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge 
          variant={user.access_status === 'approved_member' ? 'default' : user.access_status === 'pending' ? 'secondary' : 'outline'}
          className="text-xs"
        >
          {user.access_status === 'approved_member' ? 'Member' : user.access_status === 'pending' ? 'Pending' : 'Visitor'}
        </Badge>
        
        {showApprove && (
          <Button
            size="sm"
            variant="default"
            disabled={actionLoading === user.user_id}
            onClick={() => updateUserStatus(user.user_id, 'approved_member')}
            className="h-8 px-2"
          >
            {actionLoading === user.user_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
          </Button>
        )}
        
        {showRemove && (
          <Button
            size="sm"
            variant="destructive"
            disabled={actionLoading === user.user_id}
            onClick={() => updateUserStatus(user.user_id, 'visitor')}
            className="h-8 px-2"
          >
            {actionLoading === user.user_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Admin Dashboard
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Active Team ({approvedMembers.length})
            </TabsTrigger>
            <TabsTrigger value="visitors" className="gap-2">
              <Users className="w-4 h-4" />
              Visitors ({visitorsAndPending.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : approvedMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active team members yet</p>
              </div>
            ) : (
              approvedMembers.map(user => (
                <UserCard key={user.id} user={user} showRemove />
              ))
            )}
          </TabsContent>

          <TabsContent value="visitors" className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : visitorsAndPending.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending requests</p>
              </div>
            ) : (
              visitorsAndPending.map(user => (
                <UserCard key={user.id} user={user} showApprove />
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
