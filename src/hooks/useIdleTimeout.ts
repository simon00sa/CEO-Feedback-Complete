'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner'; // Import toast for notifications

// Inactivity timeout in milliseconds (10 minutes)
const TIMEOUT_MS = 10 * 60 * 1000; 
// Warning time before timeout in milliseconds (30 seconds)
const WARNING_MS = 30 * 1000; 

// Events that reset the inactivity timer
const activityEvents: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'mousedown',
  'touchstart',
  'scroll',
  'wheel',
];

export function useIdleTimeout(timeoutMs: number = TIMEOUT_MS, warningMs: number = WARNING_MS) {
  const { data: session, status } = useSession();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningToastIdRef = useRef<string | number | null>(null);
  const [isIdle, setIsIdle] = useState(false);

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
  }, []);

  const startTimers = useCallback(() => {
    clearTimers(); // Clear existing timers first

    if (status === 'authenticated') {
      setIsIdle(false); // Mark as active

      // Set warning timer
      warningTimeoutIdRef.current = setTimeout(() => {
        console.log('User idle warning triggered.');
        // Show warning toast and store its ID
        warningToastIdRef.current = toast.warning(
          'You will be signed out soon due to inactivity.', 
          {
            duration: warningMs, // Show for the remaining time
            action: {
              label: 'Stay Signed In',
              onClick: () => {
                console.log('User chose to stay signed in.');
                resetTimer(); // Reset timers on action click
              },
            },
          }
        );
      }, timeoutMs - warningMs); // Fire warning before the final timeout

      // Set final timeout timer
      timeoutIdRef.current = setTimeout(() => {
        console.log('User idle timeout reached. Signing out...');
        setIsIdle(true);
        clearTimers(); // Ensure warning toast is dismissed on sign out
        signOut({ callbackUrl: '/' }); // Redirect to home after sign out
      }, timeoutMs);
    }
  }, [status, timeoutMs, warningMs, clearTimers]);

  const resetTimer = useCallback(() => {
    // console.log('Activity detected, resetting timers.');
    clearTimers();
    startTimers();
  }, [clearTimers, startTimers]);

  const handleActivity = useCallback(() => {
    // Only reset if not already considered idle (avoids issues during sign out)
    if (!isIdle) {
      resetTimer();
    }
  }, [resetTimer, isIdle]);

  useEffect(() => {
    // Start timers on mount if authenticated
    if (status === 'authenticated') {
      startTimers();
    }

    // Add event listeners for user activity
    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, handleActivity);
    });

    // Cleanup function
    return () => {
      clearTimers();
      // Remove event listeners
      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  // Ensure dependencies cover all used variables/functions from outer scope
  }, [status, startTimers, handleActivity, clearTimers]); 

  // Return idle state if needed
  return isIdle;
}

