// src/lib/auth.ts
import { getServerSession } from "next-auth/next";
import prisma from "./prisma";
import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { AdapterUser } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";

// Timeout constant for database operations
const TIMEOUT = 10000; // 10 seconds

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Auth operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<T>;
}

// Define role hierarchy as a constant
const ROLE_HIERARCHY = {
  'Staff': 1,
  'Manager': 2,
  'Leadership': 3,
  'Admin': 4
};

// Define authOptions here
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Conditionally use providers based on environment
    ...(process.env.NODE_ENV === 'development' ? [
      // Development-only Credentials provider
      CredentialsProvider({
        name: "Development Testing",
        credentials: {
          email: { label: "Email", type: "email" },
        },
        async authorize(credentials) {
          try {
            // Automatically authorize any user during testing
            if (!credentials?.email) {
              return null;
            }
            
            // Create or find a test user in the database with timeout protection
            const user = await withTimeout(prisma.user.upsert({
              where: { email: credentials.email },
              update: { lastActive: new Date() },
              create: {
                email: credentials.email,
                name: "Test User",
                lastActive: new Date(),
              },
            }));
            return user;
          } catch (error) {
            console.error('Auth error in credentials authorize:', error);
            return null;
          }
        },
      }),
    ] : []),
    // Email provider - conditional based on environment variables being present
    ...(process.env.EMAIL_SERVER_HOST ? [
      EmailProvider({
        server: {
          host: process.env.EMAIL_SERVER_HOST,
          port: Number(process.env.EMAIL_SERVER_PORT || 587),
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD
          }
        },
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        // We need to customize sending verification token to include invitation token if present
        async sendVerificationRequest({ identifier: email, url, provider }) {
          try {
            // Check if there is a pending invitation for this email with timeout protection
            const invitation = await withTimeout(prisma.invitation.findFirst({
              where: {
                email: email,
                used: false,
                expires: { gt: new Date() }
              }
            }));
            
            // Append invitation token to the verification URL if found
            const verificationUrl = invitation ? `${url}&invitationToken=${invitation.token}` : url;
            
            // TODO: Implement actual email sending logic here using a service like Nodemailer or SendGrid
            console.log(`Sending verification email to ${email} with link: ${verificationUrl}`);
            // Example using console.log - replace with actual email sending
            // await sendEmail({ to: email, from: provider.from, subject: 'Sign in to Speak Up', text: `Sign in using this link: ${verificationUrl}` });
          } catch (error) {
            console.error('Error in sendVerificationRequest:', error);
            // Still log the basic URL even if invitation check fails
            console.log(`Sending verification email to ${email} with link: ${url}`);
          }
        }
      }),
    ] : []),
  ],
  pages: {
    // Specify custom sign-in page if needed, which can handle the invitation token
    signIn: '/auth/signin', 
    verifyRequest: '/auth/verify-request', // Page shown after email verification link is sent
    error: '/auth/error', // Custom error page
    // Add a custom sign-up page if needed to handle invitation token explicitly
    // newUser: '/auth/new-user' 
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      try {
        // For credentials provider during testing, always allow sign-in
        if (credentials) {
          return true;
        }
        
        // This is for when email provider is re-enabled
        if (email?.verificationRequest) {
          return true; // Allow the sign-in process to continue
        }
        
        // For other sign-in methods (OAuth), check if the user exists with timeout protection
        if (user.email) {
          const existingUser = await withTimeout(prisma.user.findUnique({ 
            where: { email: user.email } 
          }));
          
          if (existingUser) {
            return true; // Allow sign-in for existing users
          }
        }
        
        return true; 
      } catch (error) {
        console.error('Error in signIn callback:', error);
        // Default to allowing sign-in if there's an error
        return true;
      }
    },
    async session({ session, user, token }) {
      try {
        // Add user ID and role to the session object
        if (session.user) {
          // When using JWT strategy with Credentials provider
          if (token?.sub) {
            session.user.id = token.sub;
            // Use cached role from token if available
            if (token.role) {
              session.user.role = token.role;
            } else {
              // Fetch role from database with timeout protection
              const userWithRole = await withTimeout(prisma.user.findUnique({
                where: { id: token.sub },
                include: { role: true },
              }));
              session.user.role = userWithRole?.role?.name || null;
            }
          } 
          // When using database sessions (adapter)
          else if (user?.id) {
            session.user.id = user.id;
            // Fetch role from database with timeout protection
            const userWithRole = await withTimeout(prisma.user.findUnique({
              where: { id: user.id },
              include: { role: true },
            }));
            session.user.role = userWithRole?.role?.name || null;
          }
        }
        return session;
      } catch (error) {
        console.error('Error in session callback:', error);
        // Return the session without the role if there's an error
        return session;
      }
    },
    async jwt({ token, user }) {
      try {
        // If a user object is provided, add any custom properties to the JWT
        if (user) {
          token.id = user.id;
          // Fetch role from database with timeout protection
          const userWithRole = await withTimeout(prisma.user.findUnique({
            where: { id: user.id },
            include: { role: true },
          }));
          token.role = userWithRole?.role?.name || null;
        }
        return token;
      } catch (error) {
        console.error('Error in jwt callback:', error);
        // Return the token without the role if there's an error
        return token;
      }
    }
  },
  events: {
    async createUser(message) {
      try {
        // This event triggers *after* a user is created in the database via the adapter
        const user = message.user as AdapterUser;
        console.log("createUser event triggered for:", user.email);
        
        // Find the invitation based on email (assuming it's still valid) with timeout protection
        const invitation = await withTimeout(prisma.invitation.findFirst({
          where: {
            email: user.email,
            used: false,
            expires: { gt: new Date() }
          }
        }));

        // Use transaction for data integrity
        await prisma.$transaction(async (tx) => {
          if (invitation) {
            console.log(`Found valid invitation for ${user.email}, assigning role ID: ${invitation.roleId}`);
            // Assign the role from the invitation
            await tx.user.update({
              where: { id: user.id },
              data: { 
                roleId: invitation.roleId,
                lastActive: new Date() 
              },
            });
            // Mark invitation as used
            await tx.invitation.update({
              where: { id: invitation.id },
              data: { 
                used: true,
                updatedAt: new Date()
              },
            });
          } else {
            console.log(`No valid invitation found for ${user.email}. Assigning default role or leaving null.`);
            // Try to find default role
            let defaultRole = await tx.role.findUnique({ where: { name: 'Staff' } });
            if (!defaultRole) {
              defaultRole = await tx.role.create({ data: { name: 'Staff' } });
            }
            await tx.user.update({
              where: { id: user.id },
              data: { 
                roleId: defaultRole.id,
                lastActive: new Date()
              },
            });
          }
        });
      } catch (error) {
        console.error('Error in createUser event:', error);
        // The event handlers should never throw errors as they can break the auth flow
      }
    },
  },
  // Use JWT strategy for Credentials provider
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-do-not-use-in-production' : undefined),
};

// Helper function to capture and log errors
function captureError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  // Add your error monitoring service here if needed
}

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return null;
    }
    
    // Fetch user with timeout protection
    return await withTimeout(prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true }
    }));
  } catch (error) {
    captureError(error, 'getCurrentUser');
    return null;
  }
}

export async function getUserById(id: string) {
  try {
    return await withTimeout(prisma.user.findUnique({
      where: { id },
      include: { role: true }
    }));
  } catch (error) {
    captureError(error, `getUserById-${id}`);
    return null;
  }
}

export async function getAllUsers() {
  try {
    return await withTimeout(prisma.user.findMany({
      include: { role: true }
    }));
  } catch (error) {
    captureError(error, 'getAllUsers');
    return [];
  }
}

export async function getUsersByDepartment(department: string) {
  try {
    return await withTimeout(prisma.user.findMany({
      where: { team: { name: department } },
      include: { role: true, team: true }
    }));
  } catch (error) {
    captureError(error, `getUsersByDepartment-${department}`);
    return [];
  }
}

export async function getUsersByRole(roleName: string) {
  try {
    return await withTimeout(prisma.user.findMany({
      where: { role: { name: roleName } },
      include: { role: true }
    }));
  } catch (error) {
    captureError(error, `getUsersByRole-${roleName}`);
    return [];
  }
}

export async function isAuthorized(userId: string, requiredRole: string) {
  try {
    // Fetch user with timeout protection
    const user = await withTimeout(prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    }));
    
    if (!user?.role) return false;
    
    const userLevel = ROLE_HIERARCHY[user.role.name] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
  } catch (error) {
    captureError(error, `isAuthorized-${userId}-${requiredRole}`);
    return false;
  }
}

// Utility function to check if a user is an admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    return await isAuthorized(userId, 'Admin');
  } catch (error) {
    captureError(error, `isUserAdmin-${userId}`);
    return false;
  }
}

// Export a singleton instance for auth across the application
export const getAuth = () => authOptions;
