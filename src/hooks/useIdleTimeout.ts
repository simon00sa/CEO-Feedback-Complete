"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';

// Configure timeout constants
export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
export const DEFAULT_WARNING_MS = 30 * 1000; // 30 seconds
export const CRITICAL_AREA_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for sensitive areas

// List of events that reset the inactivity timer
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'mousedown',
  'touchstart',
  'scroll',
  'wheel',
  'focusin',
  'visibilitychange',
];

// List of critical paths that warrant shorter timeouts
const CRITICAL_PATHS = [
  '/admin',
  '/settings/security',
  '/api/admin',
];

/**
 * Hook to track user inactivity and trigger automatic logout
 * @param timeoutMs Time before logout in milliseconds (defaults to 10 minutes)
 * @param warningMs Time to show warning before logout (defaults to 30 seconds)
 * @param onTimeout Custom handler to call on timeout instead of default sign out
 * @returns Boolean indicating if the user is idle
 */
export function useIdleTimeout(
  timeoutMs: number = DEFAULT_TIMEOUT_MS, 
  warningMs: number = DEFAULT_WARNING_MS,
  onTimeout?: () => void
): boolean {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  // Refs for storing timeouts
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningToastIdRef = useRef<string | number | null>(null);
  const userActivityRef = useRef<number>(Date.now());
  const hasShownWarningRef = useRef<boolean>(false);
  
  // State tracking
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [isWarningDismissed, setIsWarningDismissed] = useState<boolean>(false);
  
  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (warningTimeoutIdRef.current) {
      clearTimeout(warningTimeoutIdRef.current);
      warningTimeoutIdRef.current = null;
    }
    // Dismiss any active warning toast
    if (warningToastIdRef.current) {
      toast.dismiss(warningToastIdRef.current);
      warningToastIdRef.current = null;
    }
    hasShownWarningRef.current = false;
    setIsWarningDismissed(false);
  }, []);
  
  // Determine appropriate timeout based on current path
  const getTimeoutForPath = useCallback(() => {
    // Use default timeout unless path matches critical paths
    if (pathname && CRITICAL_PATHS.some(criticalPath => pathname.startsWith(criticalPath))) {
      return CRITICAL_AREA_TIMEOUT_MS;
    }
    return timeoutMs;
  }, [pathname, timeoutMs]);
  
  // Start timer for session expiration
  const startTimers = useCallback(() => {
    // Don't start timers if not authenticated or pending
    if (status !== 'authenticated') {
      return;
    }
    
    clearTimers(); // Clear existing timers first
    setIsIdle(false); // Mark as active
    
    const effectiveTimeout = getTimeoutForPath();
    
    // Set warning timer
    warningTimeoutIdRef.current = setTimeout(() => {
      if (hasShownWarningRef.current || isWarningDismissed) {
        return;
      }
      
      console.log('User idle warning triggered.');
      hasShownWarningRef.current = true;
      
      // Show warning toast and store its ID
      warningToastIdRef.current = toast.warning(
        'Your session will expire soon due to inactivity.', 
        {
          duration: warningMs, // Show for the warning duration
          id: 'idle-warning', // Use consistent ID for deduplication
          action: {
            label: 'Stay Signed In',
            onClick: () => {
              console.log('User chose to stay signed in.');
              setIsWarningDismissed(true);
              resetTimer(); // Reset timers on action click
            },
          },
        }
      );
    }, effectiveTimeout - warningMs); // Fire warning before the final timeout
    
    // Set final timeout timer
    timeoutIdRef.current = setTimeout(() => {
      // Only proceed if not manually dismissed
      if (!isWarningDismissed) {
        console.log('User idle timeout reached. Signing out...');
        setIsIdle(true);
        clearTimers(); // Ensure warning toast is dismissed on sign out
        
        // Use custom handler if provided
        if (onTimeout) {
          onTimeout();
        } else {
          // Default behavior: Sign out
          signOut({ callbackUrl: '/' }).catch(err => {
            console.error('Error signing out:', err);
            // As fallback, redirect to login page
            router.push('/auth/signin?reason=timeout');
          });
        }
      }
    }, effectiveTimeout);
  }, [
    status, 
    clearTimers, 
    warningMs, 
    isWarningDismissed, 
    getTimeoutForPath, 
    onTimeout, 
    router
  ]);
  
  // Reset timer when activity is detected
  const resetTimer = useCallback(() => {
    // Only reset if not already considered idle (avoids issues during sign out)
    if (!isIdle) {
      userActivityRef.current = Date.now();
      startTimers();
    }
  }, [startTimers, isIdle]);
  
  // Handle user activity events
  const handleActivity = useCallback(() => {
    // Only process if visible and not idle
    if (document.visibilityState === 'visible' && !isIdle) {
      // Throttle resets to avoid excessive timer restarts
      if (Date.now() - userActivityRef.current > 1000) { // Only reset if > 1 second since last activity
        resetTimer();
      }
    }
  }, [resetTimer, isIdle]);
  
  // Handle visibility change separately
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // When tab becomes visible again, check time elapsed
      const timeElapsed = Date.now() - userActivityRef.current;
      
      // If user has been away for more than the timeout, log them out
      if (timeElapsed >= timeoutMs) {
        console.log('User was away for too long, triggering logout...');
        setIsIdle(true);
        
        if (onTimeout) {
          onTimeout();
        } else {
          // Perform sign out
          signOut({ callbackUrl: '/' }).catch(err => {
            console.error('Error signing out after visibility change:', err);
            router.push('/auth/signin?reason=timeout');
          });
        }
      } else if (timeElapsed >= timeoutMs - warningMs) {
        // Show warning if they're close to timeout
        if (!hasShownWarningRef.current && !isWarningDismissed) {
          hasShownWarningRef.current = true;
          warningToastIdRef.current = toast.warning(
            'Your session will expire soon due to inactivity.', 
            {
              duration: warningMs,
              id: 'idle-warning',
              action: {
                label: 'Stay Signed In',
                onClick: () => {
                  console.log('User chose to stay signed in.');
                  setIsWarningDismissed(true);
                  resetTimer();
                },
              },
            }
          );
        }
      } else {
        // If they weren't away long, just reset the timer
        resetTimer();
      }
    }
  }, [timeoutMs, warningMs, isWarningDismissed, onTimeout, resetTimer, router]);
  
  // Effect to initialize timers and event listeners
  useEffect(() => {
    // Start timers on mount if authenticated
    if (status === 'authenticated') {
      startTimers();
    }
    
    // Add event listeners for user activity
    ACTIVITY_EVENTS.forEach(eventName => {
      // Handle visibility change separately
      if (eventName === 'visibilitychange') {
        document.addEventListener(eventName, handleVisibilityChange);
      } else {
        document.addEventListener(eventName, handleActivity, { passive: true });
      }
    });
    
    // Cleanup function
    return () => {
      clearTimers();
      // Remove event listeners
      ACTIVITY_EVENTS.forEach(eventName => {
        if (eventName === 'visibilitychange') {
          document.removeEventListener(eventName, handleVisibilityChange);
        } else {
          document.removeEventListener(eventName, handleActivity);
        }
      });
    };
  }, [
    status, 
    startTimers, 
    clearTimers, 
    handleActivity, 
    handleVisibilityChange
  ]); 
  
  // Path change effect - reset timers when navigating to different paths
  useEffect(() => {
    // If path changes, we should reset the timeout to match new path's requirement
    if (status === 'authenticated') {
      resetTimer();
    }
  }, [pathname, status, resetTimer]);
  
  // Return idle state for components that need to react to it
  return isIdle;
}
