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

// Generate a secure token
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// POST /api/admin/invitations - Create an invitation
export async function POST(req: NextRequest) {
  try {
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

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return handlePrismaError(error);
  }
}

// GET /api/admin/invitations - Get list of invitations
export async function GET() {
  try {
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
