import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isUserAdmin } from "@/lib/auth";

export const config = {
  runtime: 'edge',
  regions: ['auto'], // Use closest region to user for better performance
};

export async function POST(request: Request) {
  try {
    // Extract email from request body
    const { email } = (await request.json()) as { email: string };
    
    // Get user ID from session or header
    // In a real app, you should implement proper session handling here
    // This is a placeholder - replace with your actual auth implementation
    const authHeader = request.headers.get("authorization");
    const userId = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) // Extract token
      : "someUserId"; // Fallback for development
    
    // Check if the user is an admin
    if (!await isUserAdmin(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Since the Organization model might not exist or have data,
    // we'll create a hardcoded orgId
    const orgId = "org-1"; // Default organization ID
    
    // Get the default staff role
    const staffRole = await prisma.role.findFirst({ where: { name: "Staff" } });
    let roleId = staffRole?.id;
    
    // If no role exists, create one
    if (!roleId) {
      try {
        const newRole = await prisma.role.create({
          data: { name: "Staff" }
        });
        roleId = newRole.id;
      } catch (error) {
        console.error("Error creating role:", error);
        roleId = "role-1"; // Fallback to default role ID
      }
    }
    
    // Create a unique token using crypto API
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
                     .map(b => b.toString(16).padStart(2, '0'))
                     .join('');
    
    // Create the invitation with all required fields
    const invitation = await prisma.invitation.create({
      data: {
        email,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
        token, // Use the generated token
        orgId: orgId,
        roleId: roleId,
        inviterId: userId, // Use the user ID from session/header
        used: false, // Default to false
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "PENDING" // Set status explicitly
      }
    });
    
    // Return the created invitation, but don't expose the token in the response
    const { token: _, ...safeInvitation } = invitation;
    return NextResponse.json(safeInvitation);
  } catch (error) {
    // Enhanced error handling for Netlify environment
    const errorMessage = (error as Error).message;
    console.error("Error creating invitation:", errorMessage);
    
    // Check for specific Prisma errors
    if (errorMessage.includes("Prisma Client")) {
      return NextResponse.json(
        { error: "Database connection error", details: "Could not connect to the database" },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create invitation", details: errorMessage },
      { status: 500 }
    );
  }
}
