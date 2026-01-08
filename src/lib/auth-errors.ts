/**
 * Sanitizes authentication error messages to prevent information disclosure.
 * Maps specific error messages to safe, user-friendly alternatives.
 */
export const sanitizeAuthError = (error: Error | null): string => {
  if (!error) return 'An error occurred. Please try again.';
  
  const errorMessage = error.message.toLowerCase();
  
  // Invalid credentials - generic message prevents account enumeration
  if (errorMessage.includes('invalid login') || 
      errorMessage.includes('invalid email') ||
      errorMessage.includes('invalid password') ||
      errorMessage.includes('invalid credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  
  // User already exists
  if (errorMessage.includes('user already registered') ||
      errorMessage.includes('already exists') ||
      errorMessage.includes('already been registered')) {
    return 'This email is already registered. Try signing in instead.';
  }
  
  // Email not confirmed
  if (errorMessage.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests')) {
    return 'Too many attempts. Please try again later.';
  }
  
  // Password too weak
  if (errorMessage.includes('password') && errorMessage.includes('weak')) {
    return 'Password is too weak. Please use a stronger password.';
  }
  
  // Session expired
  if (errorMessage.includes('session') && 
      (errorMessage.includes('expired') || errorMessage.includes('invalid'))) {
    return 'Your session has expired. Please sign in again.';
  }
  
  // Network errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection')) {
    return 'Connection error. Please check your internet and try again.';
  }
  
  // Generic fallback - don't expose internal errors
  return 'Authentication failed. Please try again.';
};
