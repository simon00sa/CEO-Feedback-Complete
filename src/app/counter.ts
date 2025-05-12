'use server'
// import { getCloudflareContext } from '@opennextjs/cloudflare'
import { cookies } from 'next/headers'

/**
 * Increment counter and log access
 *
 * Database connection instructions:
 * 1. Uncomment the `getCloudflareContext` import and related code.
 * 2. Ensure D1 database binding is configured in `wrangler.toml`.
 * 3. Required database tables:
 *    - counters table: name(TEXT), value(INTEGER)
 *    - access_logs table: ip(TEXT), path(TEXT), accessed_at(DATETIME)
 */
export async function incrementAndLog() {
  // const cf = await getCloudflareContext()
  const cookieStore = await cookies()

  // Get current count from cookie or default to 0
  let currentCount = parseInt(cookieStore.get('page_views')?.value || '0', 10)

  // Increment count
  currentCount += 1

  // Store updated count in cookie (expires in 1 year)
  cookieStore.set('page_views', currentCount.toString(), {
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    path: '/'
  })

  // Log this access in memory (will be lost on restart)
  const accessTime = new Date().toISOString()
  const recentAccessList = JSON.parse(cookieStore.get('recent_access')?.value || '[]')
  recentAccessList.unshift({ accessed_at: accessTime })

  // Keep only the 5 most recent accesses
  while (recentAccessList.length > 5) {
    recentAccessList.pop()
  }

  // Store recent access list in cookie
  cookieStore.set('recent_access', JSON.stringify(recentAccessList), {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    path: '/'
  })

  return {
    count: currentCount,
    recentAccess: recentAccessList
  }
}

/**
 * Get current counter value and recent access logs
 *
 * Database query instructions:
 * 1. Uncomment the `getCloudflareContext` import and related code.
 * 2. Use `cf.env.DB.prepare` to execute SQL queries.
 * 3. For local development, simulate the database using Wrangler.
 */
export async function getStats() {
  const cookieStore = await cookies()

  // Get current count from cookie or default to 0
  const currentCount = parseInt(cookieStore.get('page_views')?.value || '0', 10)

  // Get recent access list from cookie or default to empty array
  const recentAccessList = JSON.parse(cookieStore.get('recent_access')?.value || '[]')

  return {
    count: currentCount,
    recentAccess: recentAccessList
  }
}
