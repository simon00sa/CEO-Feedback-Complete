import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Existing UI utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// New API utilities
// Centralized Prisma error handler
export function handlePrismaError(error: unknown): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Unique constraint violation' },
        { status: 409 }
      );
    }
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

// Check if the current session belongs to an admin
export async function ensureAdmin(session: Session | null): Promise<boolean> {
  if (!session?.user) {
    return false;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });
  return user?.role?.name === 'ADMIN';
}
