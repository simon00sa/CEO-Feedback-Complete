import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Runtime configuration that works with both Netlify and Node.js
export const runtime = 'nodejs';
// Add maxDuration for Netlify (stays under their 26-second limit)
export const maxDuration = 25;

// Create the handler with imported authOptions
const handler = NextAuth(authOptions);

// Export only the handler methods, not authOptions
export { handler as GET, handler as POST };
