import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const config = {
  runtime: 'edge',
  regions: ['auto'], // This instructs Netlify to deploy to the edge location closest to the user
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }
  
  try {
    // Add cache headers for improved performance
    const headers = new Headers();
    headers.append('Cache-Control', 'max-age=60'); // Cache for 60 seconds
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } }, // Select the role name
    });
    
    if (!user || !user.role) {
      return NextResponse.json({ error: "User or role not found" }, { status: 404 });
    }
    
    // Compare the role name to "Admin" (case-sensitive, check your DB for exact value)
    const isAdmin = user.role.name === "Admin";
    return NextResponse.json({ isAdmin }, { headers });
  } catch (error) {
    // Enhanced error logging for Netlify environment
    const errorMessage = (error as Error).message;
    console.error("Error checking admin status:", errorMessage);
    
    // Add specific error handling
    if (errorMessage.includes("Connection refused") || errorMessage.includes("Prisma Client")) {
      return NextResponse.json(
        { error: "Database connection error", details: "Could not connect to the database" },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to check admin status", details: errorMessage },
      { status: 500 }
    );
  }
}
