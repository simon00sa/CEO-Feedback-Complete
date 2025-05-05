import NextAuth from "next-auth"
import EmailProvider from "next-auth/providers/email"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import { AdapterUser } from "next-auth/adapters"
import type { NextAuthOptions } from "next-auth"

const prisma = new PrismaClient()

// Create a separate authOptions object
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
    // Add other providers here if needed (e.g., Google, GitHub)
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
      // This callback runs when a user tries to sign in or during the email verification process
      if (email?.verificationRequest) {
        // This is part of the email verification flow
        // We need to check for the invitation token potentially passed in the URL
        // This logic might be better placed in a custom sign-in page or handled differently
        // depending on how the token is passed back from the email link.
        // For now, we assume the token check happens *before* user creation or during it.
        return true; // Allow the sign-in process to continue
      }
      // For other sign-in methods (OAuth), check if the user exists
      const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (existingUser) {
        return true; // Allow sign-in for existing users
      }
      
      // If it's a new user trying to sign in directly (without email verification link?)
      // We might want to block this unless they have an invitation.
      // This needs careful handling based on the exact flow.
      // For now, let's assume email verification is the primary way new users are created.
      return true; 
    },
    async session({ session, user }) {
      // Add user ID and role to the session object
      if (session.user) {
        session.user.id = user.id;
        const userWithRole = await prisma.user.findUnique({
          where: { id: user.id },
          include: { role: true },
        });
        session.user.role = userWithRole?.role?.name || null;
      }
      return session;
    },
  },
  events: {
    async createUser(message) {
      // This event triggers *after* a user is created in the database via the adapter
      const user = message.user as AdapterUser;
      console.log("createUser event triggered for:", user.email);
      
      // Check if there was a valid, unused invitation for this email
      // This requires passing the invitation token through the sign-up flow
      // which is complex with the default EmailProvider flow.
      // A custom sign-up page or modifying the adapter might be needed.
      
      // --- Alternative Approach: Check invitation *before* adapter creates user --- 
      // This is difficult with the standard flow. Let's assume we handle role assignment
      // slightly differently for now, perhaps by checking the invitation *after* creation
      // and updating the user record. This isn't ideal as it's not atomic.
      
      // --- Simplified Approach for now: Assign default role or handle later --- 
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
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET, // A secret is required for production
}

// Create the handler
const handler = NextAuth(authOptions)

// Export the handler methods, NOT the authOptions
export { handler as GET, handler as POST }
