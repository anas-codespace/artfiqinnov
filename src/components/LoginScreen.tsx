import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { LiquidLogo } from '@/components/ui/liquid-logo';
import { SoftFloat } from '@/components/ui/soft-float';
import { sanitizeAuthError } from '@/lib/auth-errors';

const emailSchema = z.string().email('Please enter a valid email');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

// Password requirements
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
];

const RESET_COOLDOWN_SECONDS = 60;

type AuthView = 'login' | 'forgot-password';

export function LoginScreen() {
  const { signInWithEmail, signUpWithEmail, resetPassword, isLoading } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<AuthView>('login');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  
  // Cooldown timer for password reset
  const [resetCooldown, setResetCooldown] = useState(0);

  // Check password requirements
  const passwordChecks = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map(req => ({
      ...req,
      passed: req.test(password),
    }));
  }, [password]);

  const allPasswordRequirementsMet = passwordChecks.every(req => req.passed);

  // Cooldown timer effect for password reset
  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    try {
      emailSchema.parse(email);
      if (isSignUp) {
        nameSchema.parse(name);
        if (!allPasswordRequirementsMet) {
          toast({
            title: 'Password Requirements',
            description: 'Please meet all password requirements',
            variant: 'destructive',
          });
          return;
        }
      } else {
        // For login, just check minimum length
        if (password.length < 6) {
          toast({
            title: 'Validation Error',
            description: 'Password must be at least 6 characters',
            variant: 'destructive',
          });
          return;
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error, session } = await signUpWithEmail(email, password, name);
        if (error) {
          toast({
            title: 'Sign up failed',
            description: sanitizeAuthError(error),
            variant: 'destructive',
          });
        } else if (session) {
          // Direct login - session is returned immediately (email confirmation disabled)
          setSignUpSuccess(true);
          toast({
            title: 'Account created!',
            description: 'Logging you in...',
          });
          // User will be automatically redirected by auth state change
        } else {
          // Fallback - this shouldn't happen with email confirmation disabled
          toast({
            title: 'Account created!',
            description: 'Please sign in with your new account.',
          });
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        const { error } = await signInWithEmail(email, password, rememberMe);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: sanitizeAuthError(error),
            variant: 'destructive',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetCooldown > 0) {
      toast({
        title: 'Please wait',
        description: `You can request another reset in ${resetCooldown} seconds.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({
          title: 'Reset failed',
          description: sanitizeAuthError(error),
          variant: 'destructive',
        });
      } else {
        setResetCooldown(RESET_COOLDOWN_SECONDS);
        toast({
          title: 'Reset email sent!',
          description: 'Check your inbox (and spam folder) for a password reset link.',
        });
        setView('login');
      }
    } finally {
      setLoading(false);
    }
  };

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
          {/* Liquid Logo */}
          <SoftFloat delay={0.2} className="flex flex-col items-center">
            <LiquidLogo size={100} className="mb-4" />
            <h1 className="text-3xl font-bold text-gradient-cyber">
              ARTFIQ
            </h1>
            <p className="text-muted-foreground text-sm">
              {signUpSuccess 
                ? 'Account Created!' 
                : view === 'forgot-password' 
                  ? 'Reset Password' 
                  : 'Workspace'}
            </p>
          </SoftFloat>

          {/* Sign Up Success Message */}
          {signUpSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-foreground">Account Created Successfully!</p>
                <p className="text-sm text-muted-foreground">Logging you in...</p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!signUpSuccess && view === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Toggle */}
                <div className="flex rounded-lg bg-secondary p-1">
                  <button
                    onClick={() => setIsSignUp(false)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      !isSignUp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setIsSignUp(true)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      isSignUp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {isSignUp && (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 bg-secondary border-0"
                      />
                    </div>
                  )}
                  
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-secondary border-0"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
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

                  {/* Password Requirements - Only show during sign up */}
                  {isSignUp && password.length > 0 && (
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
                    </motion.div>
                  )}

                  {/* Remember Me & Forgot Password */}
                  {!isSignUp && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                        />
                        <label
                          htmlFor="remember"
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Remember me
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setView('forgot-password')}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="cyber"
                    size="lg"
                    className="w-full"
                    disabled={loading || isLoading || (isSignUp && !allPasswordRequirementsMet)}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    )}
                  </Button>
                </form>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </motion.div>
            ) : !signUpSuccess && view === 'forgot-password' ? (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <p className="text-sm text-muted-foreground text-center">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {/* Form */}
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-secondary border-0"
                    />
                  </div>

                  {/* Spam Warning */}
                  <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                    <p className="text-xs text-warning-foreground">
                      Check your spam folder if the email doesn't arrive in 1 minute.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="cyber"
                    size="lg"
                    className="w-full"
                    disabled={loading || isLoading || resetCooldown > 0}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : resetCooldown > 0 ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Wait {resetCooldown}s
                      </span>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </Button>
                </form>

                {/* Back to login */}
                <button
                  onClick={() => setView('login')}
                  className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </SoftFloat>
    </div>
  );
}
