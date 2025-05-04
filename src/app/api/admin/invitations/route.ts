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

// Type for the request body
type InvitationBody = z.infer<typeof InvitationSchema>;

// Type guard to check if input is an object with required properties
function isValidInvitationBody(body: unknown): body is InvitationBody {
  return (
    typeof body === 'object' && 
    body !== null && 
    typeof (body as any).email === 'string' && 
    typeof (body as any).roleName === 'string'
  );
}

// POST /api/admin/invitations - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ 
        error: 'Invalid content type. Expected application/json' 
      }, { status: 415 });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid JSON',
        details: error instanceof Error ? error.message : 'Unable to parse request body'
      }, { status: 400 });
    }

    // Validate body structure
    if (!isValidInvitationBody(body)) {
      return NextResponse.json({ 
        error: 'Invalid input',
        details: 'Email and roleName are required and must be strings'
      }, { status: 400 });
    }

    // Validate input with Zod
    const parseResult = InvitationSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Invalid input',
        details: parseResult.error.errors 
      }, { status: 400 });
    }

    const { email, roleName } = parseResult.data;

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
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Admin') {
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
          select: { name: true }, // Include the role name
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
