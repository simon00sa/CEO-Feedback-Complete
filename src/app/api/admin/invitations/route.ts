import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isUserAdmin } from "@/lib/utils";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!await isUserAdmin("someUserId")) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const invitation = await prisma.invitation.create({ data: { email } });
  return NextResponse.json(invitation);
}
