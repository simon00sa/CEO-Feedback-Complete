import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma'; // Import Prisma client instance
import { Prisma } from '@prisma/client'; // Import Prisma namespace directly from @prisma/client

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 60; // Max execution time in seconds

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

// Helper to check for Admin role
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });

  return !!user && user.role?.name?.toUpperCase() === 'ADMIN';
}

// POST /api/admin/settings - Update application settings
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Forbidden: Requires Admin role.' },
        { status: 403, headers }
      );
    }

    const body = await request.json();
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an object of settings.' },
        { status: 400, headers }
      );
    }

    // Use a transaction for all updates to ensure atomicity
    const updatedSettings = await prisma.$transaction(async (tx) => {
      return Object.entries(body).reduce(async (accPromise, [key, value]) => {
        const acc = await accPromise;

        // Ensure value is not null and cast it to InputJsonValue
        const normalizedValue = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

        await tx.setting.upsert({
          where: { key },
          update: { value: normalizedValue },
          create: { key, value: normalizedValue },
        });

        return { ...acc, [key]: normalizedValue };
      }, Promise.resolve({}));
    });

    return NextResponse.json(updatedSettings, { status: 200, headers });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings.' },
      { status: 500, headers }
    );
  }
}
