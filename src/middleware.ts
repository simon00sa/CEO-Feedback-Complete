import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Use the correct runtime
export const runtime = 'experimental-edge';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/profile',
  '/feedback',
  '/settings',
  '/teams',
];

const PUBLIC_FILES = [
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
];

export async function middleware(request: NextRequest) {
  try {
    const { pathname, search } = request.nextUrl;

    // Skip middleware for public files
    if (PUBLIC_FILES.includes(pathname)) {
      return NextResponse.next();
    }

    // Check if the current route is protected
    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isProtectedRoute) {
      const authCookie =
        request.cookies.get('next-auth.session-token')?.value ||
        request.cookies.get('__Secure-next-auth.session-token')?.value ||
        request.cookies.get('next-auth.session-token.localhost')?.value;

      if (!authCookie) {
        const callbackUrl = `${pathname}${search}`;
        const url = new URL('/auth/signin', request.url);
        url.searchParams.set('callbackUrl', callbackUrl);

        const response = NextResponse.redirect(url);
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        return response;
      }

      if (pathname.startsWith('/admin')) {
        console.log('User accessing admin route:', pathname);
      }
    }

    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
