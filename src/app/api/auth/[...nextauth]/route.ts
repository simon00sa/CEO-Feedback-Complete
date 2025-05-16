import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 60; // Max execution time in seconds

// Create the handler with imported authOptions
const handler = NextAuth(authOptions);

// Export only the handler methods, not authOptions
export { handler as GET, handler as POST };
