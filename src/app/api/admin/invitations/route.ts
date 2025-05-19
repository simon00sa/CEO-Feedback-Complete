import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Updated import to use the correct Prisma instance
import { isUserAdmin } from "@/lib/auth";

// Change from edge to nodejs runtime for Netlify compatibility with Prisma
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Timeout constant for database operations
const TIMEOUT = 8000; // 8 seconds

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<T>;
}

// Helper function to capture and log errors with Netlify context
function captureError(error: unknown, context: string) {
  console.error(`[Netlify:${context}]`, error);
  // Add your error monitoring service here if needed
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
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
      return NextResponse.json({ 
        error: "Unauthorized",
        timestamp: new Date().toISOString() 
      }, { status: 403 });
    }
    
    // Since the Organization model might not exist or have data,
    // we'll create a hardcoded orgId
    const orgId = "org-1"; // Default organization ID
    
    // Get the default staff role with timeout
    const staffRole = await withTimeout(
      prisma.role.findFirst({ where: { name: "Staff" } }),
      5000
    );
    
    let roleId = staffRole?.id;
    
    // If no role exists, create one - with error handling
    if (!roleId) {
      try {
        // Use withTimeout to prevent hanging
        const newRole = await withTimeout(
          prisma.role.create({
            data: { name: "Staff" }
          }),
          6000
        );
        roleId = newRole.id;
      } catch (error) {
        captureError(error, 'invitation-role-create');
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
    
    // Create the invitation with all required fields - with timeout
    const invitation = await withTimeout(
      prisma.invitation.create({
        data: {
          email,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
          token, // Use the generated token
          orgId: orgId,
          roleId: roleId,
          inviterId: userId, // Use the user ID from session/header
          used: false, // Default to false
          status: "PENDING" // Set status explicitly
        }
      }),
      6000
    );
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Return the created invitation, but don't expose the token in the response
    const { token: _, ...safeInvitation } = invitation;
    return NextResponse.json({
      ...safeInvitation,
      meta: {
        responseTimeMs: responseTime,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    captureError(error, 'invitation-create');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating invitation:", errorMessage);
    
    const responseTime = Date.now() - startTime;
    
    // Check for specific Prisma errors
    if (errorMessage.includes("Prisma Client") || errorMessage.includes("timeout")) {
      return NextResponse.json(
        { 
          error: "Database connection error", 
          details: errorMessage,
          netlifyContext: process.env.CONTEXT || 'unknown',
          timestamp: new Date().toISOString(),
          responseTimeMs: responseTime
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create invitation", 
        details: errorMessage,
        netlifyContext: process.env.CONTEXT || 'unknown',
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime
      },
      { status: 500 }
    );
  }
}
