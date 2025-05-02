import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/authOptions';
import { addHours } from 'date-fns'; // Using date-fns for date manipulation

const prisma = new PrismaClient();

// POST /api/admin/invitations - Create a new invitation
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // TODO: Implement proper role checking - only Admins should create invitations
  // if (!session || session.user?.role !== 'Admin') {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  // }

  try {
    const { email, roleName } = await request.json();

    if (!email || !roleName) {
      return NextResponse.json({ error: 'Email and roleName are required' }, { status: 400 });
    }

    // Find the role by name
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      // Optionally create roles if they don't exist, or return error
      // For now, assume roles 'Staff', 'Leadership', 'Admin' exist
      return NextResponse.json({ error: `Role '${roleName}' not found` }, { status: 404 });
    }

    // Set expiration (e.g., 7 days from now)
    const expires = addHours(new Date(), 7 * 24);

    // Create the invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        roleId: role.id,
        expires,
        // Token is generated automatically by Prisma (@default(cuid()))
      },
    });

    // TODO: Send email to the user with the invitation link
    // The link should be something like: `${process.env.NEXTAUTH_URL}/auth/signup?token=${invitation.token}`
    // Requires an email sending service (e.g., Nodemailer, SendGrid)

    console.log(`Invitation created for ${email} with role ${roleName}, token: ${invitation.token}`);

    return NextResponse.json(invitation, { status: 201 });

  } catch (error) {
    console.error("Error creating invitation:", error);
    // Check for unique constraint violation (email already invited)
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return NextResponse.json({ error: 'An invitation for this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}

// TODO: Implement GET handler to list invitations (for Admin UI)
// export async function GET(request: Request) { ... }




// GET /api/admin/invitations - List all invitations
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  // Protect the endpoint: only Admins can list invitations
  if (!session || session.user?.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Fetch all invitations, ordered by creation date, include role name
    const invitations = await prisma.invitation.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        role: {
          select: { name: true }, // Include the role name
        },
      },
    });

    return NextResponse.json(invitations, { status: 200 });

  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

