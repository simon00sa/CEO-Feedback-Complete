// src/app/api/admin/anonymity-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema validation for invitation data
const invitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "LEADERSHIP", "STAFF"]),
  orgId: z.string(),
});

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
    const validatedData = invitationSchema.parse(body);
    
    // Create invitation with correct role relationship
    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        role: {
          // Fix: Use proper nested structure for relationship
          connect: {
            name: validatedData.role
          }
        },
        orgId: validatedData.orgId,
        inviterId: session.user.id,
        status: 'PENDING',
        token: generateToken(), // Implement this function to create a secure token
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });
    
    // TODO: Send invitation email
    
    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error("Error creating invitation:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Get anonymity settings
export async function GET() {
  try {
    const settings = await prisma.anonymitySettings.findFirst();
    
    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        level: "MEDIUM",
        minGroupSize: 5,
        activityThreshold: 3,
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error retrieving anonymity settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Function to generate a secure token
function generateToken(): string {
  // Generate a random token (implementation could use crypto for better security)
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
