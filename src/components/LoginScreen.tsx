import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
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
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (isSignUp) {
        nameSchema.parse(name);
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
        const { error } = await signUpWithEmail(email, password, name);
        if (error) {
          toast({
            title: 'Sign up failed',
            description: sanitizeAuthError(error),
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Account created!',
            description: 'You are now signed in.',
          });
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
        toast({
          title: 'Reset email sent!',
          description: 'Check your inbox for a password reset link.',
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
              {view === 'forgot-password' ? 'Reset Password' : 'Workspace'}
            </p>
          </SoftFloat>

          <AnimatePresence mode="wait">
            {view === 'login' ? (
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
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-secondary border-0"
                    />
                  </div>

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
                    disabled={loading || isLoading}
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
            ) : (
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

                  <Button
                    type="submit"
                    variant="cyber"
                    size="lg"
                    className="w-full"
                    disabled={loading || isLoading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
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
            )}
          </AnimatePresence>
        </div>
      </SoftFloat>
    </div>
  );
}
