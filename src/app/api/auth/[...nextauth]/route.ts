// Import the cache fix at the top to ensure it's loaded first
import '@/lib/auth-cache-fix';

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Runtime configuration that works with both Netlify and Node.js
export const runtime = 'nodejs';

// Add maxDuration for Netlify (stays under their 26-second limit)
export const maxDuration = 25;

// Force dynamic page generation, never static generation
export const dynamic = 'force-dynamic';

// Create the handler with imported authOptions
const handler = NextAuth(authOptions);

// Export only the handler methods, not authOptions
export { handler as GET, handler as POST };
