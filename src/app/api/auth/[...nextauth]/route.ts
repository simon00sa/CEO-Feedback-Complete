import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Runtime configuration that works with both Netlify and Node.js
export const runtime = 'nodejs';
// Removed Vercel-specific maxDuration - Netlify configures timeouts in netlify.toml

// Create the handler with imported authOptions
const handler = NextAuth(authOptions);

// Export only the handler methods, not authOptions
export { handler as GET, handler as POST };
