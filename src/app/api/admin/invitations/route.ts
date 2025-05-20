import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isUserAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Type the request body to ensure email exists
    const body = await request.json();
    const { email } = body as { email: string };
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    // Check if user is admin
    const userId = "someUserId"; // Replace with actual user ID from session
    const isAdmin = await isUserAdmin(userId);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Only admins can create invitations." },
        { status: 403 }
      );
    }
    
    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        roleId: "defaultRoleId", // Replace with actual role ID
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        inviterId: userId,
        orgId: "defaultOrgId", // Replace with actual org ID
      }
    });
    
    return NextResponse.json({ 
      success: true,
      invitation
    });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const invitations = await prisma.invitation.findMany({
      include: {
        role: true
      }
    });
    
    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
