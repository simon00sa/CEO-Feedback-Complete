import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ADMIN_ROUTES = ['/api/admin/']; // Define routes that require admin access

// Middleware to check authentication and role-based access
export async function middleware(req: Request) {
  const url = new URL(req.url);

  // Check if the request is for an admin route
  if (ADMIN_ROUTES.some((route) => url.pathname.startsWith(route))) {
    // Get the session
    const session = await getServerSession(authOptions);

    // If no session, return Unauthorized
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user has an admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user || user.role?.name !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Config to apply middleware only for specific routes
export const config = {
  matcher: '/api/admin/:path*', // Apply middleware to all admin routes
};
