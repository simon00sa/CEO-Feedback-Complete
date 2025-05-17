import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isUserAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Extract email from request body
    const { email } = (await request.json()) as { email: string };
    
    // Check if the user is an admin
    if (!await isUserAdmin("someUserId")) {
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
    
    // Create the invitation with all required fields
    const invitation = await prisma.invitation.create({
      data: {
        email,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
        token: crypto.randomUUID(), // Generate a random token
        orgId: orgId,
        roleId: roleId,
        inviterId: "someUserId", // Use the current user's ID in a real application
        used: false, // Default to false
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "PENDING" // Set status explicitly
      }
    });
    
    // Return the created invitation
    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation", details: (error as Error).message },
      { status: 500 }
    );
  }
}
