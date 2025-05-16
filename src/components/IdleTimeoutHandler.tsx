"use client";
import { useEffect, useRef } from "react";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { usePathname, useRouter } from "next/navigation";

// Define configurable timeout constants
const DEFAULT_IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const CRITICAL_PATHS_TIMEOUT = 5 * 60 * 1000; // 5 minutes for sensitive areas

interface IdleTimeoutHandlerProps {
  children: React.ReactNode;
  customTimeout?: number;
  onTimeout?: () => void;
}

export default function IdleTimeoutHandler({ 
  children, 
  customTimeout,
  onTimeout
}: IdleTimeoutHandlerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hasShownWarning = useRef(false);
  
  // Determine appropriate timeout based on path
  const determineTimeout = () => {
    // Use custom timeout if provided
    if (customTimeout) return customTimeout;
    
    // Use shorter timeout for admin/sensitive areas
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/settings')) {
      return CRITICAL_PATHS_TIMEOUT;
    }
    
    // Default timeout for other areas
    return DEFAULT_IDLE_TIMEOUT;
  };
  
  // Default timeout handler - can be overridden via props
  const defaultTimeoutHandler = () => {
    if (!hasShownWarning.current) {
      hasShownWarning.current = true;
      
      // Show warning and redirect to login after timeout
      const confirmed = window.confirm(
        "Your session is about to expire due to inactivity. Click OK to continue, or Cancel to log out."
      );
      
      if (!confirmed) {
        // Navigate to the sign out page
        router.push('/auth/signin?reason=idle');
      } else {
        // Reset the warning flag after a delay
        setTimeout(() => {
          hasShownWarning.current = false;
        }, 1000);
      }
    }
  };
  
  // Use the provided handler or the default one
  const timeoutHandler = onTimeout || defaultTimeoutHandler;
  
  // Call the hook with the appropriate timeout
  useIdleTimeout(determineTimeout(), timeoutHandler);
  
  // Add listener for visibility changes to handle browser tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset timeout when tab becomes visible again
        document.dispatchEvent(new Event('mousemove'));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return <>{children}</>;
}
