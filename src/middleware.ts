
// TODO: Implement middleware for role-based access control
// This file can be used to protect routes based on user roles.
// See: https://nextjs.org/docs/app/building-your-application/routing/middleware

// Example (needs refinement):
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    // Check if the user is trying to access an admin route
    if (req.nextUrl.pathname.startsWith("/admin")) {
      // Check if the user has the Admin role
      if (req.nextauth.token?.role !== "Admin") {
        // Redirect non-admins trying to access admin routes
        return NextResponse.redirect(new URL("/")); // Redirect to home page or an unauthorized page
      }
    }
    // Allow the request to proceed if authorized
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // User must be logged in
    },
  }
)

// Specify which paths the middleware should apply to
export const config = {
  matcher: ["/admin/:path*"], // Protect all routes under /admin
};

