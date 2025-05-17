import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isUserAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Type assertion for the request body
    const { email } = (await request.json()) as { email: string };
    
    // Check if the user is an admin
    if (!await isUserAdmin("someUserId")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    // Create the invitation
    const invitation = await prisma.invitation.create({ 
      data: { 
        email,
        // Add any additional required fields based on your schema
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
        token: crypto.randomUUID() // Generate a random token
      } 
    });
    
    // Return the invitation data
    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}
