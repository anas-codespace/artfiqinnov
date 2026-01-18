import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Lock, ArrowLeft, Check, X, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { sanitizeAuthError } from '@/lib/auth-errors';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { LiquidLogo } from '@/components/ui/liquid-logo';
import { SoftFloat } from '@/components/ui/soft-float';

// Password requirements
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
];

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

function ResetPasswordContent() {
  const { updatePassword, session, isLoading, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check password requirements
  const passwordChecks = PASSWORD_REQUIREMENTS.map(req => ({
    ...req,
    passed: req.test(password),
  }));

  const allPasswordRequirementsMet = passwordChecks.every(req => req.passed);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    // If no session and no password recovery after loading, redirect to home
    if (!isLoading && !session && !isPasswordRecovery) {
      toast({
        title: 'Invalid or expired link',
        description: 'Please request a new password reset.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [session, isLoading, isPasswordRecovery, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allPasswordRequirementsMet) {
      toast({
        title: 'Password Requirements',
        description: 'Please meet all password requirements',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast({
          title: 'Password update failed',
          description: sanitizeAuthError(error),
          variant: 'destructive',
        });
      } else {
        setSuccess(true);
        clearPasswordRecovery();
        toast({
          title: 'Password updated!',
          description: 'Your password has been successfully changed.',
        });
        // Redirect after a short delay to show success state
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <AnimatedBackground />
      
      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <SoftFloat delay={0} duration={1} y={60} className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 space-y-6">
          {/* Logo */}
          <SoftFloat delay={0.2} className="flex flex-col items-center">
            <LiquidLogo size={80} className="mb-4" />
            <h1 className="text-3xl font-bold text-gradient-cyber">
              ARTFIQ
            </h1>
            <p className="text-muted-foreground text-sm">
              {success ? 'Password Updated' : 'Set New Password'}
            </p>
          </SoftFloat>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="text-foreground font-medium">Password successfully updated!</p>
                <p className="text-sm text-muted-foreground mt-1">Redirecting you to login...</p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-secondary border-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-secondary border-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Requirements */}
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-secondary/50 rounded-lg p-3 space-y-2"
                  >
                    <p className="text-xs font-medium text-muted-foreground">Password Requirements:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {passwordChecks.map((req) => (
                        <div 
                          key={req.id} 
                          className={`flex items-center gap-2 text-xs transition-colors ${
                            req.passed ? 'text-green-500' : 'text-muted-foreground'
                          }`}
                        >
                          {req.passed ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>{req.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Passwords match indicator */}
                    {confirmPassword.length > 0 && (
                      <div 
                        className={`flex items-center gap-2 text-xs transition-colors mt-2 pt-2 border-t border-border ${
                          passwordsMatch ? 'text-green-500' : 'text-destructive'
                        }`}
                      >
                        {passwordsMatch ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        <span>Passwords match</span>
                      </div>
                    )}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  variant="cyber"
                  size="lg"
                  className="w-full"
                  disabled={loading || !allPasswordRequirementsMet || !passwordsMatch}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>Update Password</span>
                  )}
                </Button>
              </form>

              {/* Back to login */}
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </>
          )}
        </div>
      </SoftFloat>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <AuthProvider>
      <ResetPasswordContent />
    </AuthProvider>
  );
}
