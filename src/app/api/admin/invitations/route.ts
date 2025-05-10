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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const result = invitationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    const validatedData = result.data;

    const role = await prisma.role.findUnique({
      where: { id: validatedData.roleId },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        roleId: role.id,
        inviterId: currentUser.id,
        status: 'PENDING',
        token: generateToken(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        orgId: validatedData.orgId,
        used: false,
      } as Prisma.InvitationUncheckedCreateInput,
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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      select: {
        id: true,
        email: true,
        roleId: true,
        inviterId: true, // Explicitly include inviterId
        createdAt: true,
        updatedAt: true,
        expires: true,
        token: true,
        used: true,
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

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
