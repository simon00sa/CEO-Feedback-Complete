import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Create the handler with imported authOptions
const handler = NextAuth(authOptions);

// Export only the handler methods, not authOptions
export { handler as GET, handler as POST };
