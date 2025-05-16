import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isUserAdmin } from '@/lib/utils';

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 60; // Max execution time in seconds

// Define validation schema
const invitationSchema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
  orgId: z.string().min(1),
});

// Type definition for raw SQL query results
type InvitationQueryResult = {
  id: string;
  email: string;
  roleId: string;
  inviterId: string;
  status: string;
  token: string;
  expires: Date;
  orgId: string;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
  role_id: string | null;
  role_name: string | null;
  inviter_id: string | null;
  inviter_name: string | null;
  inviter_email: string | null;
};

// Type for the formatted response
type FormattedInvitation = {
  id: string;
  email: string;
  roleId: string;
  inviterId: string;
  status: string;
  token: string;
  expires: Date;
  orgId: string;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: {
    id: string;
    name: string;
  } | null;
  inviter: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

// Function to generate a unique token with fallback for Edge runtime
const generateToken = () => {
  try {
    // Import at runtime to handle Edge compatibility
    const { randomUUID } = require('crypto');
    return randomUUID();
  } catch (e) {
    // Fallback for Edge runtime
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

// Add response headers
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

export async function POST(req: NextRequest) {
  try {
    // Only allow admins to create invitations
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
    }

    // Parse and validate request body
    const body = await req.json();
    const result = invitationSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400, headers }
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
        { status: 404, headers }
      );
    }

    // Use Prisma's typed methods instead of raw SQL
    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        roleId: role.id,
        inviterId: currentUser.id,
        status: 'PENDING',
        token: generateToken(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        orgId: validatedData.orgId,
        used: false,
      },
      include: {
        role: true,
        inviter: true,
      },
    });
    
    return NextResponse.json(invitation, { status: 201, headers });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers }
    );
  }
}

export async function GET() {
  try {
    // Only allow admins to list invitations
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
    }

    // Use Prisma's typed methods instead of raw SQL
    const invitations = await prisma.invitation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(invitations, { headers });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Only allow admins to delete invitations
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
    }

    // Get the invitation ID from the query parameters
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400, headers }
      );
    }

    // Use Prisma's typed methods instead of raw SQL
    try {
      await prisma.invitation.delete({
        where: { id },
      });
    } catch (error) {
      // Handle not found error
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404, headers }
      );
    }

    return NextResponse.json({ success: true }, { headers });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation', details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers }
    );
  }
}
