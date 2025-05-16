import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Export edge runtime configuration for better performance on Vercel
export const runtime = 'edge';

// Define protected routes as a constant outside the function
// to avoid recreating it on every request
const PROTECTED_ROUTES = ['/dashboard', '/admin', '/profile', '/feedback', '/settings', '/teams'];

// Define public files that should always be accessible
const PUBLIC_FILES = [
  '/favicon.ico', 
  '/robots.txt', 
  '/sitemap.xml', 
  '/manifest.json'
];

export async function middleware(request: NextRequest) {
  try {
    const { pathname, search } = request.nextUrl;
    
    // Skip middleware for public files
    if (PUBLIC_FILES.some(file => pathname === file)) {
      return NextResponse.next();
    }
    
    // Check if the current route is protected
    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
      pathname.startsWith(route)
    );
    
    if (isProtectedRoute) {
      // Check for authentication cookie with better handling for different environments
      const authCookie = 
        request.cookies.get('next-auth.session-token')?.value ||
        request.cookies.get('__Secure-next-auth.session-token')?.value ||
        // Include localhost cookie pattern for development
        request.cookies.get('next-auth.session-token.localhost')?.value;
      
      if (!authCookie) {
        // Redirect unauthenticated users
        const callbackUrl = `${pathname}${search}`;
        const url = new URL('/auth/signin', request.url);
        url.searchParams.set('callbackUrl', callbackUrl);
        
        // Add response headers
        const response = NextResponse.redirect(url);
        
        // Add helpful cache headers for redirects
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        
        return response;
      }
      
      // Optionally, role-based path protection could be added here
      // but would require JWT decoding which is best done in API routes
      
      // For admin routes, we could add additional checks
      if (pathname.startsWith('/admin')) {
        // We can't check roles here easily without decoding the JWT
        // So we just log it and let the page/API handle role-based access
        console.log('User accessing admin route:', pathname);
      }
    }
    
    // For all responses, we can add security headers
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // In case of errors, allow the request to continue
    // to avoid blocking legitimate requests
    return NextResponse.next();
  }
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
