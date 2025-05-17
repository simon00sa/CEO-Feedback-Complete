import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isUserAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  // Option 1: Type assertion
  const { email } = (await request.json()) as { email: string };
  
  if (!await isUserAdmin("someUserId")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  const invitation = await prisma.invitation.create({ data: { email } });
  return NextResponse.json(invitation);
}
