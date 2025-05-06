import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for invitation validation
const InvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'LEADERSHIP', 'STAFF']),
  orgId: z.string().uuid(),
});

// POST /api/admin/invitations - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = InvitationSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' }, 
        { status: 400 }
      );
    }

    // First, find the role by name
    const role = await prisma.role.findUnique({
      where: { name: validatedData.role }
    });

    if (!role) {
      return NextResponse.json(
        { error: `Role '${validatedData.role}' not found` },
        { status: 400 }
      );
    }

    // Create invitation with correct role relation
    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        role: { connect: { id: role.id } },
        orgId: validatedData.orgId,
        inviterId: session.user.id,
        status: 'PENDING',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });

    // TODO: Send invitation email here

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors }, 
        { status: 400 }
      );
    }
    
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' }, 
      { status: 500 }
    );
  }
}

// GET /api/admin/invitations - List all invitations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invitations = await prisma.invitation.findMany({
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' }, 
      { status: 500 }
    );
  }
}
