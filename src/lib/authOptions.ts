import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import EmailProvider from "next-auth/providers/email"
import { AdapterUser } from "next-auth/adapters"

const prisma = new PrismaClient()

// Export the auth configuration for use in other files
export const authOptions = {
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
        const invitation = await prisma.invitation.findFirst({
          where: {
            email: email,
            used: false,
            expires: { gt: new Date() }
          }
        });
        
        const verificationUrl = invitation ? `${url}&invitationToken=${invitation.token}` : url;
        
        console.log(`Sending verification email to ${email} with link: ${verificationUrl}`);
      }
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      if (email?.verificationRequest) return true;
      const existingUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (existingUser) return true;
      return true;
    },
    async session({ session, user }) {
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
      const user = message.user as AdapterUser;
      console.log("createUser event triggered for:", user.email);
      
      const invitation = await prisma.invitation.findFirst({
        where: {
          email: user.email,
          used: false,
          expires: { gt: new Date() }
        }
      });

      if (invitation) {
        console.log(`Found valid invitation for ${user.email}, assigning role ID: ${invitation.roleId}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { roleId: invitation.roleId },
        });
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { used: true },
        });
      } else {
        console.log(`No valid invitation found for ${user.email}. Assigning default role or leaving null.`);
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
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}
