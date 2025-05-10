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

    // Create invitation - using raw query to bypass type issues
    const [invitation] = await prisma.$queryRaw<Array<{
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
    }>>`
      INSERT INTO "Invitation" (id, email, "roleId", "inviterId", status, token, expires, "orgId", used, "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${validatedData.email}, ${role.id}, ${currentUser.id}, 'PENDING', ${generateToken()}, ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}, ${validatedData.orgId}, false, ${new Date()}, ${new Date()})
      RETURNING *`;
    
    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Using raw SQL for more control
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

    // Use raw SQL to avoid Prisma type issues - now properly typed!
    const invitations: InvitationQueryResult[] = await prisma.$queryRaw`
      SELECT 
        i.*,
        r.id as role_id,
        r.name as role_name,
        u.id as inviter_id,
        u.name as inviter_name,
        u.email as inviter_email
      FROM "Invitation" i
      LEFT JOIN "Role" r ON i."roleId" = r.id
      LEFT JOIN "User" u ON i."inviterId" = u.id
      ORDER BY i."createdAt" DESC
    `;

    // Transform the result to match our expected structure
    const formattedInvitations: FormattedInvitation[] = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      roleId: inv.roleId,
      inviterId: inv.inviterId,
      status: inv.status,
      token: inv.token,
      expires: inv.expires,
      orgId: inv.orgId,
      used: inv.used,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      role: inv.role_id ? {
        id: inv.role_id,
        name: inv.role_name!,
      } : null,
      inviter: inv.inviter_id ? {
        id: inv.inviter_id,
        name: inv.inviter_name,
        email: inv.inviter_email!,
      } : null,
    }));

    return NextResponse.json(formattedInvitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations', details: error instanceof Error ? error.message : String(error) },
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

    // Use raw SQL to ensure it works - properly typed
    const result: Array<{ id: string }> = await prisma.$queryRaw`
      DELETE FROM "Invitation" WHERE id = ${id}
      RETURNING id`;
    
    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to delete invitation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
