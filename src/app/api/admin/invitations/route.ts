import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { isUserAdmin } from '@/lib/utils';

// Define validation schema
const invitationSchema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
  orgId: z.string().min(1),
});

// Function to generate a unique token
function generateToken() {
  return randomUUID();
}

export async function POST(req: NextRequest) {
  try {
    // Only allow admins to create invitations
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const result = invitationSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    const validatedData = result.data;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: validatedData.roleId },
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        role: { connect: { id: role.id } },
        inviter: { connect: { id: currentUser.id } }, // Connect to the current user
        status: 'PENDING',
        token: generateToken(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        orgId: validatedData.orgId,
        used: false,
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
