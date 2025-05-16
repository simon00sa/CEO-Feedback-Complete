import { Handler } from '@netlify/functions';

const PAGE_VIEWS_COOKIE = 'page_views';
const RECENT_ACCESS_COOKIE = 'recent_access';

interface AccessLog {
  accessed_at: string;
  path?: string;
}

interface StatsResponse {
  count: number;
  recentAccess: AccessLog[];
}

export const handler: Handler = async (event, context) => {
  try {
    const { headers } = event;
    const cookies = headers.cookie ? parseCookies(headers.cookie) : {};

    // Get current count from cookie or default to 0
    let currentCount = parseInt(cookies[PAGE_VIEWS_COOKIE] || '0', 10);
    if (isNaN(currentCount)) {
      currentCount = 0;
    }

    // Increment count
    currentCount += 1;

    // Create access log entry
    const accessLog: AccessLog = {
      accessed_at: new Date().toISOString(),
      path: event.path || '/',
    };

    // Parse existing access logs
    let recentAccessList: AccessLog[] = [];
    if (cookies[RECENT_ACCESS_COOKIE]) {
      try {
        recentAccessList = JSON.parse(cookies[RECENT_ACCESS_COOKIE]);
        if (!Array.isArray(recentAccessList)) {
          recentAccessList = [];
        }
      } catch (error) {
        console.error('Error parsing recent access cookie:', error);
      }
    }

    // Add new access log and limit to 5 entries
    recentAccessList.unshift(accessLog);
    while (recentAccessList.length > 5) {
      recentAccessList.pop();
    }

    // Generate response headers
    const responseHeaders = {
      'Set-Cookie': [
        `${PAGE_VIEWS_COOKIE}=${currentCount}; Path=/; HttpOnly;`,
        `${RECENT_ACCESS_COOKIE}=${JSON.stringify(recentAccessList)}; Path=/; HttpOnly;`,
      ],
    };

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        count: currentCount,
        recentAccess: recentAccessList,
      }),
    };
  } catch (error) {
    console.error('Error in counter function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// Helper to parse cookies
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.split('=').map((c) => c.trim());
    return { ...cookies, [name]: decodeURIComponent(value) };
  }, {});
}
