'use server'

import { cookies } from 'next/headers'

// Define constants for cookie names to avoid typos and enable easy changes
const PAGE_VIEWS_COOKIE = 'page_views';
const RECENT_ACCESS_COOKIE = 'recent_access';

// Define interfaces for better type safety
interface AccessLog {
  accessed_at: string;
  path?: string;
  user_agent?: string;
}

interface StatsResponse {
  count: number;
  recentAccess: AccessLog[];
}

/**
 * Increment counter and log access
 * 
 * @param path Optional path parameter to track specific page views
 * @returns Updated stats object with count and recent accesses
 */
export async function incrementAndLog(path?: string): Promise<StatsResponse> {
  try {
    const cookieStore = cookies();
    
    // Get current count from cookie or default to 0
    let currentCount = parseInt(cookieStore.get(PAGE_VIEWS_COOKIE)?.value || '0', 10);
    
    // Handle potential NaN result from parseInt
    if (isNaN(currentCount)) {
      currentCount = 0;
    }
    
    // Increment count
    currentCount += 1;
    
    // Store updated count in cookie (expires in 1 year)
    cookieStore.set(PAGE_VIEWS_COOKIE, currentCount.toString(), {
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      path: '/',
      sameSite: 'lax', // Better security practice
      secure: process.env.NODE_ENV === 'production', // Secure in production
    });
    
    // Create access log entry
    const accessLog: AccessLog = {
      accessed_at: new Date().toISOString(),
      path: path || '/'
    };
    
    // Try to parse existing access logs
    let recentAccessList: AccessLog[] = [];
    try {
      const recentAccessJson = cookieStore.get(RECENT_ACCESS_COOKIE)?.value;
      if (recentAccessJson) {
        recentAccessList = JSON.parse(recentAccessJson);
        // Validate it's an array
        if (!Array.isArray(recentAccessList)) {
          recentAccessList = [];
        }
      }
    } catch (error) {
      // Reset to empty array if parsing fails
      recentAccessList = [];
      console.error('Error parsing recent access cookie:', error);
    }
    
    // Add new access log at the beginning
    recentAccessList.unshift(accessLog);
    
    // Keep only the 5 most recent accesses
    while (recentAccessList.length > 5) {
      recentAccessList.pop();
    }
    
    // Store recent access list in cookie
    cookieStore.set(RECENT_ACCESS_COOKIE, JSON.stringify(recentAccessList), {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    
    return {
      count: currentCount,
      recentAccess: recentAccessList
    };
  } catch (error) {
    console.error('Error in incrementAndLog:', error);
    // Return default values in case of error
    return {
      count: 0,
      recentAccess: []
    };
  }
}

/**
 * Get current counter value and recent access logs
 * 
 * @returns Stats object with count and recent accesses
 */
export async function getStats(): Promise<StatsResponse> {
  try {
    const cookieStore = cookies();
    
    // Get current count from cookie or default to 0
    const countString = cookieStore.get(PAGE_VIEWS_COOKIE)?.value;
    const currentCount = countString ? parseInt(countString, 10) : 0;
    
    // Get recent access list from cookie
    let recentAccessList: AccessLog[] = [];
    try {
      const recentAccessJson = cookieStore.get(RECENT_ACCESS_COOKIE)?.value;
      if (recentAccessJson) {
        recentAccessList = JSON.parse(recentAccessJson);
        // Validate it's an array
        if (!Array.isArray(recentAccessList)) {
          recentAccessList = [];
        }
      }
    } catch (error) {
      console.error('Error parsing recent access cookie:', error);
    }
    
    return {
      count: isNaN(currentCount) ? 0 : currentCount,
      recentAccess: recentAccessList
    };
  } catch (error) {
    console.error('Error in getStats:', error);
    // Return default values in case of error
    return {
      count: 0,
      recentAccess: []
    };
  }
}

/**
 * Reset counter and access logs
 * 
 * @returns Empty stats object
 */
export async function resetStats(): Promise<StatsResponse> {
  try {
    const cookieStore = cookies();
    
    // Clear cookies
    cookieStore.delete(PAGE_VIEWS_COOKIE);
    cookieStore.delete(RECENT_ACCESS_COOKIE);
    
    return {
      count: 0,
      recentAccess: []
    };
  } catch (error) {
    console.error('Error in resetStats:', error);
    return {
      count: 0,
      recentAccess: []
    };
  }
}
