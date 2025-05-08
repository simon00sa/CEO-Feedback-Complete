import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Define admin route prefix
const ADMIN_ROUTE_PREFIX = '/api/admin/';

/**
 * Middleware to enforce authentication and authorization for admin routes.
 * Ensures that only authenticated users with the ADMIN role can access routes under /api/admin/.
 */
export async function middleware(req: Request) {
  const url = new URL(req.url);

  // Check if the request is for an admin route
  if (url.pathname.startsWith(ADMIN_ROUTE_PREFIX)) {
    try {
      // Retrieve the session using NextAuth
      const session = await getServerSession(authOptions);

      // Return 401 Unauthorized if no session is found
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
      }

      // Fetch user details from the database
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { role: true },
      });

      // Check if the user has the ADMIN role
      if (!user || user.role?.name !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }

      // Allow the request to proceed if the user is an admin
      return NextResponse.next();
    } catch (error) {
      console.error('Error in admin middleware:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Allow the request to proceed if it is not an admin route
  return NextResponse.next();
}

// Middleware configuration to apply it only to admin routes
export const config = {
  matcher: '/api/admin/:path*', // Match all routes under /api/admin/
};
