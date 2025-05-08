import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { handlePrismaError } from '@/lib/utils';
import { randomBytes } from 'crypto';

// Define the schema for the request body
const InvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'LEADERSHIP', 'STAFF']),
  orgId: z.string(),
});

// Define the type for the response
type InvitationResponse = {
  success: boolean;
  invitation: {
    id: string;
    email: string;
    role: string;
    status: string;
    expires: Date;
    used: boolean;
  };
};

// Centralized utility to generate a secure token
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// POST /api/admin/invitations - For creating invitations
export async function POST(req: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await req.json();
    const validatedData = InvitationSchema.parse(body);

    // Use a Prisma transaction to ensure atomic operations
    const invitation = await prisma.$transaction(async (prisma) => {
      const role = await prisma.role.findUnique({
        where: { name: validatedData.role },
        select: { id: true },
      });

      if (!role) {
        throw new Error('Role not found');
      }

      return prisma.invitation.create({
        data: {
          email: validatedData.email,
          role: { connect: { id: role.id } },
          inviterId: 'admin-user-id', // Middleware ensures only admins can access
          status: 'PENDING',
          token: generateToken(),
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          used: false,
          orgId: validatedData.orgId,
        },
        select: {
          id: true,
          email: true,
          status: true,
          expires: true,
          used: true,
          role: { select: { name: true } },
        },
      });
    });

    const response: InvitationResponse = {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role.name,
        status: invitation.status,
        expires: invitation.expires,
        used: invitation.used,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating invitation:', error);
    return handlePrismaError(error);
  }
}

// GET /api/admin/invitations - Get all invitations
export async function GET() {
  try {
    // Fetch all invitations with optimized query
    const invitations = await prisma.invitation.findMany({
      select: {
        id: true,
        email: true,
        status: true,
        expires: true,
        used: true,
        role: { select: { name: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return handlePrismaError(error);
  }
}
