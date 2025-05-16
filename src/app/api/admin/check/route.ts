import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } }, // Select the role name
    });

    if (!user || !user.role) {
      return NextResponse.json({ error: "User or role not found" }, { status: 404 });
    }

    // Compare the role name to "Admin" (case-sensitive, check your DB for exact value)
    const isAdmin = user.role.name === "Admin";
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ error: "Failed to check admin status" }, { status: 500 });
  }
}
