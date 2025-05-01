'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner'; // Import toast for notifications

// Inactivity timeout in milliseconds (10 minutes)
const TIMEOUT_MS = 10 * 60 * 1000;
// Warning time before timeout in milliseconds (30 seconds)
const WARNING_MS = 30 * 1000;

// Events that reset the inactivity timer
const activityEvents = [
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
  
  // Reset all timers
  const resetTimers = useCallback(() => {
    if (warningToastIdRef.current) {
      toast.dismiss(warningToastIdRef.current);
      warningToastIdRef.current = null;
    }
    
    if (warningTimeoutIdRef.current) {
      clearTimeout(warningTimeoutIdRef.current);
      warningTimeoutIdRef.current = null;
    }
    
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    
    // Set warning timer
    warningTimeoutIdRef.current = setTimeout(() => {
      warningToastIdRef.current = toast.warning(
        'You will be logged out due to inactivity soon.',
        {
          duration: Infinity,
          action: {
            label: 'Keep me signed in',
            onClick: () => resetTimers(),
          },
        }
      );
    }, timeoutMs - warningMs);
    
    // Set logout timer
    timeoutIdRef.current = setTimeout(() => {
      if (session) {
        setIsIdle(true);
        signOut();
        toast.error('You have been logged out due to inactivity.', {
          duration: 5000,
        });
      }
    }, timeoutMs);
  }, [session, timeoutMs, warningMs]);
  
  // Setup activity listeners
  useEffect(() => {
    if (!session) return;
    
    const handleActivity = () => {
      resetTimers();
    };
    
    // Initialize timers
    resetTimers();
    
    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });
    
    // Cleanup
    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (warningTimeoutIdRef.current) clearTimeout(warningTimeoutIdRef.current);
      if (warningToastIdRef.current) toast.dismiss(warningToastIdRef.current);
      
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [session, resetTimers]);
  
  return { isIdle };
}
