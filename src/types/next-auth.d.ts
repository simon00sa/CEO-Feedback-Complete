import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string | null;
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    role?: string | null;
  }
}

// Optional: Extend JWT if you're using it
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string | null;
  }
}
