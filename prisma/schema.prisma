import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

    // Create invitation - using inviterId instead of inviter relationship
    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        roleId: role.id,
        inviterId: currentUser.id, // Use inviterId directly instead of the relationship
        status: 'PENDING',
        token: generateToken(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        orgId: validatedData.orgId,
        used: false,
      } as Prisma.InvitationUncheckedCreateInput, // Use unchecked input type
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

// Using select instead of include for more precise control
export async function GET() {
  try {
    // Only allow admins to list invitations
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all invitations using select
    const invitations = await prisma.invitation.findMany({
      select: {
        id: true,
        email: true,
        token: true,
        roleId: true,
        expires: true,
        used: true,
        createdAt: true,
        updatedAt: true,
        inviterId: true, // Now explicitly selecting inviterId
        status: true,
        orgId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch inviter data separately
    const invitationsWithInviters = await Promise.all(
      invitations.map(async (invitation) => {
        let inviter = null;
        if (invitation.inviterId) {
          try {
            inviter = await prisma.user.findUnique({
              where: { id: invitation.inviterId },
              select: {
                id: true,
                name: true,
                email: true,
              },
            });
          } catch (error) {
            console.error(`Error fetching inviter for invitation ${invitation.id}:`, error);
          }
        }
        
        return {
          ...invitation,
          inviter,
        };
      })
    );

    return NextResponse.json(invitationsWithInviters);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Only allow admins to delete invitations
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the invitation ID from the query parameters
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Check if invitation exists
    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Delete the invitation
    await prisma.invitation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}
