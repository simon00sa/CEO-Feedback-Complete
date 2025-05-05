import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { z } from 'zod';
import { addHours } from 'date-fns';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// Define the request body type
type RequestBody = {
  email: string;
  roleName: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body with explicit typing
    const body = await request.json() as RequestBody;
    const { email, roleName } = body;

    if (!email || !roleName) {
      return NextResponse.json({ error: 'Email and roleName are required' }, { status: 400 });
    }

    // Check for admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true }
    });

    if (!user || user.role.name !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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
