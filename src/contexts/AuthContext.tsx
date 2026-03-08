import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  access_status: 'visitor' | 'pending' | 'approved_member' | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  isGuest: boolean;
  authEvent: AuthChangeEvent | null;
  signInWithEmail: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: Error | null; session: Session | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loginAsGuest: () => void;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [authEvent, setAuthEvent] = useState<AuthChangeEvent | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data && !error) {
      setProfile({
        id: data.id,
        user_id: data.user_id,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        email: data.email,
        access_status: (data.access_status as Profile['access_status']) ?? 'visitor',
      });
    }
  };

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        setAuthEvent(event);
        setSession(session);
        setUser(session?.user ?? null);
        
        // CRITICAL: Handle PASSWORD_RECOVERY event
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery detected');
          setIsPasswordRecovery(true);
        }
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const signInWithEmail = async (email: string, password: string, rememberMe: boolean = true) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // If not remembering, session will be cleared when browser closes
    if (!rememberMe && !error) {
      // Store a flag to clear session on browser close
      sessionStorage.setItem('clearSessionOnClose', 'true');
    } else {
      sessionStorage.removeItem('clearSessionOnClose');
    }
    
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: name,
        },
      },
    });
    return { error, session: data?.session ?? null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (!error) {
      // Clear recovery state after successful password update
      setIsPasswordRecovery(false);
    }
    return { error };
  };

  const resendVerificationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { error };
  };

  const signOut = async () => {
    if (isGuest) {
      setIsGuest(false);
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
    setIsPasswordRecovery(false);
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    // Create a minimal fake user object so the app renders the dashboard
    setUser({ id: 'guest', email: 'guest@artfiq.com' } as User);
    setProfile({
      id: 'guest',
      user_id: 'guest',
      display_name: 'Guest User',
      avatar_url: null,
      email: 'guest@artfiq.com',
      access_status: 'visitor',
    });
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      isLoading,
      isPasswordRecovery,
      isGuest,
      authEvent,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      updatePassword,
      resendVerificationEmail,
      signOut,
      loginAsGuest,
      clearPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
