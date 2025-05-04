import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { AdapterUser } from "next-auth/adapters";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
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
      async sendVerificationRequest({ identifier: email, url, provider }) {
        try {
          // Find a valid, unused invitation for this email
          const invitation = await prisma.invitation.findFirst({
            where: {
              email: email,
              used: false,
              expires: { gt: new Date() }
            },
            select: { token: true }
          });
          
          // Append invitation token to verification URL if found
          const verificationUrl = invitation 
            ? `${url}&invitationToken=${invitation.token}` 
            : url;
          
          // TODO: Replace console.log with actual email sending logic
          console.log(`Verification email sent to ${email}. URL: ${verificationUrl}`);
        } catch (error) {
          console.error(`Error in sendVerificationRequest: ${error}`);
          // Optionally rethrow or handle the error as needed
        }
      }
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async signIn({ user, email, account }) {
      // Additional logging for debugging
      console.log(`Sign-in attempt for user: ${user.email}, verification request: ${email?.verificationRequest}`);

      // Allow verification request flow
      if (email?.verificationRequest) return true;

      // Check if user exists
      try {
        const existingUser = await prisma.user.findUnique({ 
          where: { email: user.email },
          select: { id: true } 
        });

        return !!existingUser;
      } catch (error) {
        console.error(`Error during sign-in check: ${error}`);
        return false;
      }
    },
    async session({ session, user }) {
      try {
        if (session.user) {
          // Always set the user ID
          session.user.id = user.id;

          // Fetch user with role in a single query
          const userWithRole = await prisma.user.findUnique({
            where: { id: user.id },
            include: { role: true },
          });

          // Set role, defaulting to null if no role found
          session.user.role = userWithRole?.role?.name || null;
        }
        return session;
      } catch (error) {
        console.error(`Error in session callback: ${error}`);
        return session;
      }
    },
  },
  events: {
    async createUser(message) {
      try {
        const user = message.user as AdapterUser;
        console.log(`User creation event triggered for: ${user.email}`);
        
        // Find a valid invitation for this email
        const invitation = await prisma.invitation.findFirst({
          where: {
            email: user.email,
            used: false,
            expires: { gt: new Date() }
          }
        });

        if (invitation) {
          console.log(`Valid invitation found for ${user.email}. Assigning role.`);
          
          // Update user with invitation's role
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
          console.log(`No valid invitation for ${user.email}. Assigning default role.`);
          
          // Find or create default 'Staff' role
          let defaultRole = await prisma.role.findUnique({ 
            where: { name: 'Staff' } 
          });

          if (!defaultRole) {
            defaultRole = await prisma.role.create({ 
              data: { name: 'Staff' } 
            });
          }

          // Assign default role to user
          await prisma.user.update({
            where: { id: user.id },
            data: { roleId: defaultRole.id },
          });
        }
      } catch (error) {
        console.error(`Error in createUser event: ${error}`);
        // Consider how you want to handle errors during user creation
      }
    },
  },
  // Enable debug mode only in development
  debug: process.env.NODE_ENV === 'development',
  
  // Ensure a secret is set for production
  secret: process.env.NEXTAUTH_SECRET,
}
