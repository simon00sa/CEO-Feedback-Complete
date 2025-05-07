// src/app/api/admin/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';

// Schema for validating invitation data
const InvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "LEADERSHIP", "STAFF"]),
  orgId: z.string(),
});

// Helper to check if user is admin
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });
  
  return user?.role?.name === "ADMIN";
}

// POST /api/admin/invitations - For creating invitations
export async function POST(req: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify user is an admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });
    
    if (!user || user.role?.name !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await req.json();
    const validatedData = InvitationSchema.parse(body);
    
    // Find the role
    const role = await prisma.role.findUnique({
      where: { name: validatedData.role }
    });
    
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    
    // Create invitation with correct relationship structures
    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        role: {
          connect: {
            id: role.id
          }
        },
        inviterId: session.user.id,
        status: 'PENDING',
        token: generateToken(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        used: false,
        orgId: validatedData.orgId,
      },
    });
    
    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error("Error creating invitation:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    
    // Check for Prisma errors without using instanceof
    if (typeof error === 'object' && error !== null && 'code' in error) {
      // This is likely a Prisma error
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: "An invitation for this email already exists." },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/admin/invitations - Get all invitations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const invitations = await prisma.invitation.findMany({
      include: {
        role: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
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

// Function to generate a secure token using crypto
function generateToken(): string {
  return randomBytes(32).toString('hex');
}
