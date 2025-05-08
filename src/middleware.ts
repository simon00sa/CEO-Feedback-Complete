import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl;
  
  // Define routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/admin',
    '/profile',
    '/feedback'
    // Add any other protected routes here
  ];
  
  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (isProtectedRoute) {
    // Instead of using getToken from next-auth/jwt (which uses eval),
    // we'll use a simpler approach to check for authentication
    
    // Option 1: Check for authentication cookie
    const authCookie = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value;
    
    if (!authCookie) {
      // No auth cookie found, redirect to sign in
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', encodeURI(pathname));
      return NextResponse.redirect(url);
    }
    
    // Note: This is a simplified check and only verifies the cookie exists
    // For more security, consider implementing a stateless JWT check if needed
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all routes except API routes, static files, and auth routes
    '/((?!api|_next/static|_next/image|favicon.ico|auth/signin|auth/verify-request).*)',
  ],
};
