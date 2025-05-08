// src/lib/auth.ts
import { getServerSession } from "next-auth/next";
import prisma from "./prisma";
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { AdapterUser } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";

// Define authOptions here
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Temporarily use a credentials provider for testing instead of email
    CredentialsProvider({
      name: "Development Testing",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        // Automatically authorize any user during testing
        if (!credentials?.email) {
          return null;
        }
        
        // Create or find a test user in the database
        const user = await prisma.user.upsert({
          where: { email: credentials.email },
          update: {},
          create: {
            email: credentials.email,
            name: "Test User",
          },
        });
        return user;
      },
    }),
    // Email provider commented out for now, will be enabled in production
    /*
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT || 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      },
      from: process.env.EMAIL_FROM,
      // We need to customize sending verification token to include invitation token if present
      async sendVerificationRequest({ identifier: email, url, provider }) {
        // TODO: Check if there is a pending invitation for this email
        const invitation = await prisma.invitation.findFirst({
          where: {
            email: email,
            used: false,
            expires: { gt: new Date() }
          }
        });
        
        // Append invitation token to the verification URL if found
        const verificationUrl = invitation ? `${url}&invitationToken=${invitation.token}` : url;
        
        // TODO: Implement actual email sending logic here using a service like Nodemailer or SendGrid
        console.log(`Sending verification email to ${email} with link: ${verificationUrl}`);
        // Example using console.log - replace with actual email sending
        // await sendEmail({ to: email, from: provider.from, subject: 'Sign in to Speak Up', text: `Sign in using this link: ${verificationUrl}` });
      }
    }),
    */
  ],
  pages: {
    // Specify custom sign-in page if needed, which can handle the invitation token
    signIn: '/auth/signin', 
    verifyRequest: '/auth/verify-request', // Page shown after email verification link is sent
    // Add a custom sign-up page if needed to handle invitation token explicitly
    // newUser: '/auth/new-user' 
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // For credentials provider during testing, always allow sign-in
      if (credentials) {
        return true;
      }
      
      // This is for when email provider is re-enabled
      if (email?.verificationRequest) {
        return true; // Allow the sign-in process to continue
      }
      
      // For other sign-in methods (OAuth), check if the user exists
      const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (existingUser) {
        return true; // Allow sign-in for existing users
      }
      
      return true; 
    },
    async session({ session, user, token }) {
      // Add user ID and role to the session object
      if (session.user) {
        // When using JWT strategy with Credentials provider
        if (token?.sub) {
          session.user.id = token.sub;
          const userWithRole = await prisma.user.findUnique({
            where: { id: token.sub },
            include: { role: true },
          });
          session.user.role = userWithRole?.role?.name || null;
        } 
        // When using database sessions (adapter)
        else if (user?.id) {
          session.user.id = user.id;
          const userWithRole = await prisma.user.findUnique({
            where: { id: user.id },
            include: { role: true },
          });
          session.user.role = userWithRole?.role?.name || null;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      // If a user object is provided, add any custom properties to the JWT
      if (user) {
        token.id = user.id;
        const userWithRole = await prisma.user.findUnique({
          where: { id: user.id },
          include: { role: true },
        });
        token.role = userWithRole?.role?.name || null;
      }
      return token;
    }
  },
  events: {
    async createUser(message) {
      // This event triggers *after* a user is created in the database via the adapter
      const user = message.user as AdapterUser;
      console.log("createUser event triggered for:", user.email);
      
      // Find the invitation based on email (assuming it's still valid)
      const invitation = await prisma.invitation.findFirst({
        where: {
          email: user.email,
          used: false,
          expires: { gt: new Date() }
        }
      });

      if (invitation) {
        console.log(`Found valid invitation for ${user.email}, assigning role ID: ${invitation.roleId}`);
        // Assign the role from the invitation
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: invitation.roleId },
        });
        // Mark invitation as used
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { used: true },
        });
      } else {
        console.log(`No valid invitation found for ${user.email}. Assigning default role or leaving null.`);
        // Optionally assign a default role (e.g., 'Staff') if no invitation is found,
        // or leave roleId null and potentially block access until assigned.
        // For now, let's find/create a default 'Staff' role and assign it.
        let defaultRole = await prisma.role.findUnique({ where: { name: 'Staff' } });
        if (!defaultRole) {
          defaultRole = await prisma.role.create({ data: { name: 'Staff' } });
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: defaultRole.id },
        });
      }
    },
  },
  // Use JWT strategy for Credentials provider
  session: {
    strategy: "jwt",
  },
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET, // A secret is required for production
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  });
  return user;
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true }
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({
    include: { role: true }
  });
}

export async function getUsersByDepartment(department: string) {
  return prisma.user.findMany({
    where: { team: { name: department } },
    include: { role: true, team: true }
  });
}

export async function getUsersByRole(roleName: string) {
  return prisma.user.findMany({
    where: { role: { name: roleName } },
    include: { role: true }
  });
}

export async function isAuthorized(userId: string, requiredRole: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });
  if (!user?.role) return false;
  const roleHierarchy = {
    'Staff': 1,
    'Manager': 2,
    'Leadership': 3,
    'Admin': 4
  };
  const userLevel = roleHierarchy[user.role.name] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

// Utility function to check if a user is an admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  return isAuthorized(userId, 'Admin');
}

// Export a singleton instance for auth across the application
export const getAuth = () => authOptions;
