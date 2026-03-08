import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useUserStatus } from '@/hooks/useUserStatus';

const DISMISS_KEY = 'guestBannerDismissed';

interface AccessWarningContextType {
  isVisible: boolean;
  showWarning: () => void;
  hideWarning: () => void;
}

const AccessWarningContext = createContext<AccessWarningContextType | undefined>(undefined);

const AUTO_DISMISS_MS = 10000;

export function AccessWarningProvider({ children }: { children: ReactNode }) {
  const { isVisitor, isPending, isMember, isAdmin, isLoading } = useUserStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  const showWarning = useCallback(() => {
    if (isMember || isAdmin) return;
    // Respect sessionStorage dismissal
    if (sessionStorage.getItem(DISMISS_KEY) === 'true') return;

    clearExistingTimeout();
    setIsVisible(true);

    const newTimeoutId = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_DISMISS_MS);

    setTimeoutId(newTimeoutId);
  }, [isMember, isAdmin, clearExistingTimeout]);

  const hideWarning = useCallback(() => {
    clearExistingTimeout();
    setIsVisible(false);
    sessionStorage.setItem(DISMISS_KEY, 'true');
  }, [clearExistingTimeout]);

  useEffect(() => {
    if (!isLoading && (isVisitor || isPending)) {
      if (sessionStorage.getItem(DISMISS_KEY) === 'true') return;
      const initialTimeout = setTimeout(() => {
        showWarning();
      }, 500);
      return () => clearTimeout(initialTimeout);
    }
  }, [isLoading, isVisitor, isPending, showWarning]);

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  return (
    <AccessWarningContext.Provider value={{ isVisible, showWarning, hideWarning }}>
      {children}
    </AccessWarningContext.Provider>
  );
}

export function useAccessWarning() {
  const context = useContext(AccessWarningContext);
  if (context === undefined) {
    throw new Error('useAccessWarning must be used within an AccessWarningProvider');
  }
  return context;
}

// Global trigger function for easy access
export function triggerAccessWarning() {
  // This is a placeholder - the actual trigger happens through context
  console.warn('Use useAccessWarning().showWarning() instead');
}
