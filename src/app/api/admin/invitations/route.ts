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
    
    // Get the default organization ID - in a real app, this might come from the request
    // or be determined based on the current user's organization
    const defaultOrg = await prisma.organization.findFirst();
    const orgId = defaultOrg?.id || "org-1"; // Fallback to a default ID if needed
    
    // Get the default staff role - this would typically be configured in your app
    const staffRole = await prisma.role.findFirst({ where: { name: "Staff" } });
    const roleId = staffRole?.id || "role-1"; // Fallback to a default ID if needed
    
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
        updatedAt: new Date()
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
