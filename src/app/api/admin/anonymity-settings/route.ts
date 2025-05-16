import { NextResponse } from "next/server";
import { PrismaClient as Prisma } from "@prisma/client";

interface AnonymitySettingsResponse { id: string; }

const prisma = new Prisma();

function formatAnonymitySettingsResponse(settings: Record<string, any>): AnonymitySettingsResponse {
  return { id: String(settings.id) };
}

export async function GET() {
  const settings = await prisma.anonymitySettings.findFirst();
  if (!settings) return NextResponse.json({ error: "Settings not found" }, { status: 404 });
  const formattedSettings = formatAnonymitySettingsResponse(settings);
  return NextResponse.json(formattedSettings);
}
