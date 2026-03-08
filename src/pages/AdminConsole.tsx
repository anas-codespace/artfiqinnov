import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, KeyRound, Users, UserCheck, UserX, Loader2, AlertTriangle, CheckCircle, ArrowLeft, HelpCircle, Pencil, Save, Clock, CalendarPlus, PartyPopper, Trash2, CalendarDays, CheckCircle2, XCircle, FolderLock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PostingBadge, isFounderRole } from '@/components/ui/posting-badge';
import { useCompanyHolidays, useAllLeaveRequests, type LeaveRequest } from '@/hooks/useAttendance';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import defaultAvatar from '@/assets/default-avatar.webp';

// Allowed admin emails
const ADMIN_EMAILS = [
  'mohammedsulaimanofficial@gmail.com',
  'anas.m77581@gmail.com'
];

// Security questions
const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite movie?"
];

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  access_status: string | null;
  posting: string | null;
}

type Stage = 'loading' | 'unauthorized' | 'setup' | 'locked' | 'forgot-pin' | 'unlocked';

export default function AdminConsole() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Stage management
  const [stage, setStage] = useState<Stage>('loading');
  
  // PIN Setup state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  // PIN Entry state
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Forgot PIN state
  const [savedQuestion, setSavedQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Dashboard state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, 'ceo' | 'cto' | 'team'>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingPosting, setEditingPosting] = useState<string | null>(null);
  const [postingValue, setPostingValue] = useState('');

  // Today's attendance state
  const [todayAttendance, setTodayAttendance] = useState<Array<{ user_id: string; punch_in_time: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  // Holiday declaration state
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState<Date | undefined>();
  const [holidayTitle, setHolidayTitle] = useState('');
  const [declaringHoliday, setDeclaringHoliday] = useState(false);
  const { holidays, refetch: refetchHolidays } = useCompanyHolidays();
  const { leaves: allLeaves, isLoading: leavesLoading, refetch: refetchLeaves } = useAllLeaveRequests();
  const [leaveProfiles, setLeaveProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  
  // Vault access requests state
  const [vaultRequests, setVaultRequests] = useState<Array<{ id: string; user_id: string; file_id: string; status: string; created_at: string }>>([]);
  const [vaultRequestProfiles, setVaultRequestProfiles] = useState<Record<string, string>>({});
  const [vaultRequestFiles, setVaultRequestFiles] = useState<Record<string, string>>({});
  const [vaultLoading, setVaultLoading] = useState(true);

  // Check access and PIN status on mount
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      // Get user email from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .single();

      const userEmail = profile?.email || user.email;

      // Check if user is allowed
      if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        setStage('unauthorized');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      // Check if PIN exists
      const { data: pinData } = await supabase
        .from('admin_pins')
        .select('security_question')
        .eq('user_id', user.id)
        .single();

      if (pinData) {
        setSavedQuestion(pinData.security_question);
        setStage('locked');
      } else {
        setStage('setup');
      }
    };

    checkAccess();
  }, [user, navigate]);

  // Fetch users when unlocked
  useEffect(() => {
    if (stage === 'unlocked') {
      fetchUsers();
      fetchTodayAttendance();
    }
  }, [stage]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const [{ data, error }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('id, user_id, display_name, email, avatar_url, access_status, posting').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    if (error) {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } else {
      setUsers(data || []);
    }

    const rolesMap: Record<string, 'ceo' | 'cto' | 'team'> = {};
    roles?.forEach(r => { rolesMap[r.user_id] = r.role as 'ceo' | 'cto' | 'team'; });
    setUserRoles(rolesMap);

    setLoadingUsers(false);
  };

  const fetchTodayAttendance = async () => {
    setAttendanceLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('user_id, punch_in_time')
      .eq('date', today);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('access_status', 'approved_member');

    const logMap = new Map<string, string>();
    (logs || []).forEach(l => logMap.set(l.user_id, l.punch_in_time));

    const combined = (profiles || []).map(p => ({
      user_id: p.user_id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      punch_in_time: logMap.get(p.user_id) || '',
    }));

    // Sort: punched in first, then not punched in
    combined.sort((a, b) => {
      if (a.punch_in_time && !b.punch_in_time) return -1;
      if (!a.punch_in_time && b.punch_in_time) return 1;
      return 0;
    });

    setTodayAttendance(combined);
    setAttendanceLoading(false);
  };

  const handleDeclareHoliday = async () => {
    if (!holidayDate || !holidayTitle.trim() || !user) return;
    setDeclaringHoliday(true);

    const dateStr = format(holidayDate, 'yyyy-MM-dd');
    const { error } = await supabase
      .from('company_holidays')
      .insert({ date: dateStr, title: holidayTitle.trim(), declared_by: user.id });

    if (error) {
      toast({ title: 'Error', description: error.message.includes('duplicate') ? 'A holiday already exists on this date.' : 'Failed to declare holiday', variant: 'destructive' });
    } else {
      toast({ title: '🎉 Holiday Declared', description: `${holidayTitle.trim()} on ${format(holidayDate, 'PPP')}` });
      setHolidayModalOpen(false);
      setHolidayDate(undefined);
      setHolidayTitle('');
      refetchHolidays();
    }
    setDeclaringHoliday(false);
  };

  const handleDeleteHoliday = async (id: string) => {
    const { error } = await supabase.from('company_holidays').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete holiday', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Holiday removed' });
      refetchHolidays();
    }
  };

  // Fetch profiles for leave requests
  useEffect(() => {
    if (allLeaves.length === 0) return;
    const userIds = [...new Set(allLeaves.map(l => l.user_id))];
    supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds)
      .then(({ data }) => {
        const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
        (data || []).forEach(p => { map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
        setLeaveProfiles(map);
      });
  }, [allLeaves]);

  const handleLeaveAction = async (leaveId: string, action: 'approved' | 'rejected', note?: string) => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: action, reviewed_by: user!.id, reviewer_note: note || null, updated_at: new Date().toISOString() })
      .eq('id', leaveId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update leave request', variant: 'destructive' });
    } else {
      toast({ title: action === 'approved' ? '✅ Approved' : '❌ Rejected', description: `Leave request ${action}` });
      refetchLeaves();
    }
  };

  const handleSetupPin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast({ title: 'Error', description: 'PIN must be exactly 4 digits', variant: 'destructive' });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: 'Error', description: 'PINs do not match', variant: 'destructive' });
      return;
    }
    if (!securityQuestion) {
      toast({ title: 'Error', description: 'Please select a security question', variant: 'destructive' });
      return;
    }
    if (securityAnswer.trim().length < 2) {
      toast({ title: 'Error', description: 'Please provide a valid security answer', variant: 'destructive' });
      return;
    }

    setSetupLoading(true);

    const { error } = await supabase
      .from('admin_pins')
      .insert({
        user_id: user!.id,
        pin_hash: newPin.toString(), // Ensure PIN is a string
        security_question: securityQuestion,
        security_answer_hash: securityAnswer.trim().toLowerCase()
      });

    if (error) {
      console.error("Supabase PIN Setup Error:", error.message, error.details, error.code);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to setup PIN', 
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Success', description: 'Admin PIN configured successfully!' });
      setStage('unlocked');
    }

    setSetupLoading(false);
  };

  const handleVerifyPin = async () => {
    if (enteredPin.length !== 4) return;

    setVerifying(true);
    setPinError(false);

    const { data, error } = await supabase
      .rpc('verify_admin_pin', { _user_id: user!.id, _pin: enteredPin });

    if (error || !data) {
      setPinError(true);
      setEnteredPin('');
      toast({ title: 'Invalid PIN', description: 'Please try again', variant: 'destructive' });
    } else {
      setStage('unlocked');
      toast({ title: 'Access Granted', description: 'Welcome to Command Center' });
    }

    setVerifying(false);
  };

  const handleForgotPin = async () => {
    setRecoveryLoading(true);

    const { data, error } = await supabase
      .rpc('verify_security_answer', { _user_id: user!.id, _answer: recoveryAnswer.trim() });

    if (error) {
      console.error("Supabase Security Answer Error:", error.message, error.details, error.code);
      toast({ title: 'Error', description: error.message || 'Failed to verify answer', variant: 'destructive' });
    } else if (!data) {
      toast({ title: 'Incorrect Answer', description: 'Security answer does not match', variant: 'destructive' });
    } else {
      // Delete old PIN to allow new setup
      const { error: deleteError } = await supabase
        .from('admin_pins')
        .delete()
        .eq('user_id', user!.id);

      if (deleteError) {
        console.error("Supabase PIN Delete Error:", deleteError.message, deleteError.details, deleteError.code);
        toast({ title: 'Error', description: 'Failed to reset PIN. Please try again.', variant: 'destructive' });
      } else {
        toast({ title: 'Verified', description: 'Please set up a new PIN' });
        setRecoveryAnswer('');
        setNewPin('');
        setConfirmPin('');
        setSecurityQuestion('');
        setSecurityAnswer('');
        setStage('setup');
      }
    }

    setRecoveryLoading(false);
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
    setActionLoading(userId);
    
    const { error } = await supabase
      .from('profiles')
      .update({ access_status: newStatus })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update user status', variant: 'destructive' });
    } else {
      toast({
        title: 'Success',
        description: newStatus === 'approved_member' ? 'User approved!' : 'User demoted to visitor.',
      });
      await fetchUsers();
    }
    
    setActionLoading(null);
  };

  const handleSavePosting = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ posting: postingValue.trim() || null })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update posting', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Posting updated successfully!' });
      await fetchUsers();
    }
    setEditingPosting(null);
    setPostingValue('');
    setActionLoading(null);
  };

  const handleKeypadPress = (digit: string) => {
    if (enteredPin.length < 4) {
      const newVal = enteredPin + digit;
      setEnteredPin(newVal);
      if (newVal.length === 4) {
        setTimeout(() => handleVerifyPin(), 100);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
  };

  // Render based on stage
  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </motion.div>
      </div>
    );
  }

  if (stage === 'unauthorized') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center p-8"
        >
          <AlertTriangle className="w-16 h-16 text-destructive" />
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access this area.</p>
          <p className="text-sm text-muted-foreground">Redirecting to home...</p>
        </motion.div>
      </div>
    );
  }

  if (stage === 'setup') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card p-8 rounded-2xl border border-border"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Secure Setup</h1>
            <p className="text-muted-foreground text-sm mt-2">Configure your Command Center PIN</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Create 4-Digit PIN</Label>
              <Input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div>
              <Label>Confirm PIN</Label>
              <Input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div>
              <Label>Security Question</Label>
              <Select value={securityQuestion} onValueChange={setSecurityQuestion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a question" />
                </SelectTrigger>
                <SelectContent>
                  {SECURITY_QUESTIONS.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Security Answer</Label>
              <Input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Your answer..."
              />
            </div>

            <Button
              className="w-full mt-6"
              onClick={handleSetupPin}
              disabled={setupLoading}
            >
              {setupLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              Secure Command Center
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (stage === 'locked') {
    const handlePinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
      setEnteredPin(value);
      setPinError(false);
      
      // Auto-submit when 4 digits entered
      if (value.length === 4) {
        setTimeout(() => handleVerifyPin(), 100);
      }
    };

    const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && enteredPin.length === 4) {
        handleVerifyPin();
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm glass-card p-8 rounded-2xl border border-border"
        >
          <div className="text-center mb-8">
            <motion.div
              animate={pinError ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <KeyRound className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold">Command Center</h1>
            <p className="text-muted-foreground text-sm mt-2">Enter your access PIN</p>
          </div>

          {/* PIN Input Field */}
          <div className="mb-6">
            <motion.div
              animate={pinError ? { x: [-8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <input
                type="password"
                value={enteredPin}
                onChange={handlePinInputChange}
                onKeyDown={handlePinKeyDown}
                maxLength={4}
                autoFocus
                disabled={verifying}
                placeholder="Enter Admin PIN"
                className="w-full h-14 bg-black/30 backdrop-blur-sm border border-border rounded-xl text-center text-2xl tracking-[0.75rem] text-foreground placeholder:text-muted-foreground placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:shadow-[0_0_20px_rgba(0,210,255,0.3)] transition-all duration-300 disabled:opacity-50"
              />
            </motion.div>
          </div>

          {/* PIN Indicator Dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8 }}
                animate={{ 
                  scale: enteredPin.length > i ? 1.2 : 1,
                  backgroundColor: enteredPin.length > i ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                }}
                className="w-3 h-3 rounded-full transition-all duration-200"
              />
            ))}
          </div>

          {/* Unlock Button */}
          <Button
            onClick={handleVerifyPin}
            disabled={enteredPin.length !== 4 || verifying}
            className="w-full h-12 bg-gradient-to-r from-primary/80 to-primary backdrop-blur-md border border-primary/30 hover:shadow-[0_0_25px_rgba(0,210,255,0.4)] transition-all duration-300 font-semibold"
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Unlock
              </>
            )}
          </Button>

          <button
            onClick={() => setStage('forgot-pin')}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors mt-6"
          >
            <HelpCircle className="w-4 h-4 inline mr-1" />
            Forgot PIN?
          </button>

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  if (stage === 'forgot-pin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card p-8 rounded-2xl border border-border"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold">PIN Recovery</h1>
            <p className="text-muted-foreground text-sm mt-2">Answer your security question</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm font-medium">{savedQuestion}</p>
            </div>

            <div>
              <Label>Your Answer</Label>
              <Input
                type="text"
                value={recoveryAnswer}
                onChange={(e) => setRecoveryAnswer(e.target.value)}
                placeholder="Enter your answer..."
              />
            </div>

            <Button
              className="w-full"
              onClick={handleForgotPin}
              disabled={recoveryLoading || recoveryAnswer.trim().length < 2}
            >
              {recoveryLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Verify & Reset PIN
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setRecoveryAnswer('');
                setStage('locked');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to PIN Entry
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // UNLOCKED - Full Dashboard
  const approvedMembers = users.filter(u => u.access_status === 'approved_member');
  const visitorsAndPending = users.filter(u => u.access_status === 'visitor' || u.access_status === 'pending');

  const UserCard = ({ user, showApprove = false, showRemove = false }: { 
    user: UserProfile; 
    showApprove?: boolean;
    showRemove?: boolean;
  }) => {
    const isEditingThis = editingPosting === user.user_id;
    const memberRole = userRoles[user.user_id] || 'team';
    const isFounder = isFounderRole(memberRole);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-xl bg-secondary/30 border border-border/50 w-full max-w-full overflow-hidden"
      >
        {/* Left side - Avatar & Text (must shrink) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
            <AvatarImage src={user.avatar_url || defaultAvatar} alt={user.display_name || 'User'} />
            <AvatarFallback>{(user.display_name || 'U')[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{user.display_name || 'Unknown'}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
            {/* Posting Badge + Edit */}
            <div className="flex items-center gap-1.5 mt-1">
              {isEditingThis && !isFounder ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={postingValue}
                    onChange={(e) => setPostingValue(e.target.value)}
                    placeholder="e.g. Tech Lead"
                    className="h-6 text-[10px] w-28 sm:w-36 px-2 py-0"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePosting(user.user_id);
                      if (e.key === 'Escape') { setEditingPosting(null); setPostingValue(''); }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-5 h-5"
                    onClick={() => handleSavePosting(user.user_id)}
                    disabled={actionLoading === user.user_id}
                  >
                    <Save className="w-3 h-3 text-primary" />
                  </Button>
                </div>
              ) : (
                <>
                  <PostingBadge posting={user.posting} role={memberRole} />
                  {!isFounder && (
                    <button
                      onClick={() => {
                        setEditingPosting(user.user_id);
                        setPostingValue(user.posting || '');
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side - Badge & Actions (fixed size) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Badge 
            variant={user.access_status === 'approved_member' ? 'default' : user.access_status === 'pending' ? 'secondary' : 'outline'}
            className="hidden xs:inline-flex text-xs"
          >
            {user.access_status === 'approved_member' ? 'Member' : user.access_status === 'pending' ? 'Pending' : 'Visitor'}
          </Badge>
          
          {showApprove && (
            <Button
              size="sm"
              variant="default"
              disabled={actionLoading === user.user_id}
              onClick={() => updateUserStatus(user.user_id, 'approved_member')}
              className="flex-shrink-0"
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
              className="flex-shrink-0"
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
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg truncate">Command Center</h1>
              <p className="text-xs text-muted-foreground">Admin Console</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')} className="flex-shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-full overflow-x-hidden">
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="team" className="gap-1 text-[10px] sm:text-sm">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1 text-[10px] sm:text-sm">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1 text-[10px] sm:text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="leaves" className="gap-1 text-[10px] sm:text-sm relative">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leaves</span>
              {allLeaves.filter(l => l.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {allLeaves.filter(l => l.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="holidays" className="gap-1 text-[10px] sm:text-sm">
              <PartyPopper className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Holidays</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Active Team Members</h2>
              <Badge variant="secondary">{approvedMembers.length} members</Badge>
            </div>
            
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : approvedMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active team members</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvedMembers.map(user => (
                  <UserCard key={user.id} user={user} showRemove />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Visitors & Pending Requests</h2>
              <Badge variant="secondary">{visitorsAndPending.length} users</Badge>
            </div>
            
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : visitorsAndPending.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visitorsAndPending.map(user => (
                  <UserCard key={user.id} user={user} showApprove />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Today's Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Today's Attendance</h2>
              <Badge variant="secondary">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Badge>
            </div>

            {attendanceLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : todayAttendance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No team members found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAttendance.map((member) => (
                  <motion.div
                    key={member.user_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50"
                  >
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarImage src={member.avatar_url || defaultAvatar} />
                      <AvatarFallback>{(member.display_name || 'U')[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.display_name || 'Unknown'}</p>
                    </div>
                    {member.punch_in_time ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[11px] font-semibold text-emerald-400">
                          {new Date(member.punch_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-[11px] font-semibold text-amber-400">Not Punched In</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Leave Requests Tab */}
          <TabsContent value="leaves" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Leave Requests</h2>
              <Badge variant="secondary">{allLeaves.filter(l => l.status === 'pending').length} pending</Badge>
            </div>

            {leavesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : allLeaves.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No leave requests yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allLeaves.map((leave) => {
                  const profile = leaveProfiles[leave.user_id];
                  return (
                    <motion.div
                      key={leave.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 flex-shrink-0">
                            <AvatarImage src={profile?.avatar_url || defaultAvatar} />
                            <AvatarFallback>{(profile?.display_name || 'U')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{profile?.display_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(leave.start_date + 'T00:00:00'), 'MMM d')} — {format(new Date(leave.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          leave.status === 'approved' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                          leave.status === 'rejected' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                          'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        }`}>
                          {leave.status.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground bg-card/50 rounded-lg p-2">{leave.reason}</p>

                      {leave.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 gap-1.5 text-xs bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                            variant="outline"
                            onClick={() => handleLeaveAction(leave.id, 'approved')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 gap-1.5 text-xs"
                            variant="destructive"
                            onClick={() => handleLeaveAction(leave.id, 'rejected')}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Holidays Tab */}
          <TabsContent value="holidays" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Company Holidays</h2>
              <Button size="sm" onClick={() => setHolidayModalOpen(true)} className="gap-1.5">
                <CalendarPlus className="w-4 h-4" />
                Declare Holiday
              </Button>
            </div>

            {holidays.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PartyPopper className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No holidays declared yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {holidays.map((holiday) => (
                  <motion.div
                    key={holiday.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <PartyPopper className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{holiday.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(holiday.date + 'T00:00:00'), 'EEEE, MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteHoliday(holiday.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Holiday Declaration Modal */}
        <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-primary" />
                Declare Company Holiday
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Holiday Title</Label>
                <Input
                  value={holidayTitle}
                  onChange={(e) => setHolidayTitle(e.target.value)}
                  placeholder="e.g. Diwali, Company Off..."
                />
              </div>
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !holidayDate && "text-muted-foreground")}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {holidayDate ? format(holidayDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={holidayDate}
                      onSelect={setHolidayDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleDeclareHoliday}
                disabled={declaringHoliday || !holidayDate || !holidayTitle.trim()}
                className="w-full"
              >
                {declaringHoliday ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PartyPopper className="w-4 h-4 mr-2" />}
                Declare Holiday
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
