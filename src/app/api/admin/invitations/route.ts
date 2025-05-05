import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { z } from 'zod';
import { addHours } from 'date-fns';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// Zod schema for invitation input validation
const InvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleName: z.string().min(1, 'Role name is required')
});

// Helper to check for Admin role
async function isAdmin(request: NextRequest): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  });

  return !!user && user.role.name.toUpperCase() === 'ADMIN';
}

// POST /api/admin/invitations - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication and admin role
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = InvitationSchema.parse(body);
    const { email, roleName } = validatedData;

    // Find the role by name
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      return NextResponse.json({ 
        error: `Role '${roleName}' not found` 
      }, { status: 404 });
    }

    // Set expiration (7 days from now)
    const expires = addHours(new Date(), 7 * 24);

    try {
      // Create the invitation
      const invitation = await prisma.invitation.create({
        data: {
          email,
          roleId: role.id,
          expires,
        },
        include: {
          role: {
            select: { name: true }
          }
        }
      });

      // TODO: Send email to the user with the invitation link
      console.log(`Invitation created for ${email} with role ${roleName}, token: ${invitation.token}`);

      return NextResponse.json(invitation, { status: 201 });
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return NextResponse.json({ 
          error: 'An invitation for this email already exists.' 
        }, { status: 409 });
      }
      throw error;
    }

  } catch (error) {
    console.error("Error creating invitation:", error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input',
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create invitation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/admin/invitations - List all invitations
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication and admin role
    if (!(await isAdmin(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Extract pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch paginated invitations
    const invitations = await prisma.invitation.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        role: {
          select: { name: true },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.invitation.count();

    return NextResponse.json({
      invitations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ 
      error: 'Failed to fetch invitations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
