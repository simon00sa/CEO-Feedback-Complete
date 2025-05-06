// src/app/api/admin/anonymity-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

// Schema for validating anonymity settings - updated to match actual schema
const AnonymitySettingsSchema = z.object({
  minGroupSize: z.number().default(8),
  minActiveUsers: z.number().default(5),
  activityThresholdDays: z.number().default(30),
  combinationLogic: z.string().default('DEPARTMENT'),
  enableGrouping: z.boolean().default(true),
  anonymityLevel: z.string().default('MEDIUM'),
  enableAnonymousComments: z.boolean().default(true),
  enableAnonymousVotes: z.boolean().default(true),
  enableAnonymousAnalytics: z.boolean().default(false),
});

// Schema for validating invitation data
const InvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "LEADERSHIP", "STAFF"]),
  orgId: z.string(),
});

// Helper to check if user is admin - no parameters needed
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });
  
  return user?.role?.name === "ADMIN";
}

// GET /api/admin/anonymity-settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const settings = await prisma.anonymitySettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist - only use actual schema fields
      const defaultSettings = await prisma.anonymitySettings.create({
        data: {
          minGroupSize: 8,
          minActiveUsers: 5,
          activityThresholdDays: 30,
          combinationLogic: 'DEPARTMENT',
          enableGrouping: true,
        },
      });
      return NextResponse.json(defaultSettings);
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching anonymity settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anonymity settings' }, 
      { status: 500 }
    );
  }
}

// PUT /api/admin/anonymity-settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validatedData = AnonymitySettingsSchema.parse(body);
    
    // First, find an existing record
    const existingSettings = await prisma.anonymitySettings.findFirst();
    
    let settings;
    if (existingSettings) {
      // Update existing record - only use fields that exist in the schema
      settings = await prisma.anonymitySettings.update({
        where: { id: existingSettings.id },
        data: {
          minGroupSize: validatedData.minGroupSize,
          minActiveUsers: validatedData.minActiveUsers,
          activityThresholdDays: validatedData.activityThresholdDays,
          combinationLogic: validatedData.combinationLogic,
          enableGrouping: validatedData.enableGrouping,
          enableAnonymousComments: validatedData.enableAnonymousComments,
          enableAnonymousVotes: validatedData.enableAnonymousVotes,
          enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics,
        },
      });
    } else {
      // Create new record - only use fields that exist in the schema
      settings = await prisma.anonymitySettings.create({
        data: {
          minGroupSize: validatedData.minGroupSize,
          minActiveUsers: validatedData.minActiveUsers,
          activityThresholdDays: validatedData.activityThresholdDays,
          combinationLogic: validatedData.combinationLogic,
          enableGrouping: validatedData.enableGrouping,
          enableAnonymousComments: validatedData.enableAnonymousComments,
          enableAnonymousVotes: validatedData.enableAnonymousVotes,
          enableAnonymousAnalytics: validatedData.enableAnonymousAnalytics,
        },
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors }, 
        { status: 400 }
      );
    }
    
    console.error('Error updating anonymity settings:', error);
    return NextResponse.json(
      { error: 'Failed to update anonymity settings' }, 
      { status: 500 }
    );
  }
}

// POST /api/admin/anonymity-settings - For creating invitations
export async function POST(req: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Verify user is an admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });
    
    if (!user || user.role?.name !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await req.json();
    const validatedData = InvitationSchema.parse(body);
    
    // Create invitation with correct relationship structures
    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        role: {
          connect: {
            name: validatedData.role
          }
        },
        orgId: validatedData.orgId,
        inviter: {
          connect: {
            id: session.user.id
          }
        },
        status: 'PENDING',
        token: generateToken(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });
    
    // TODO: Send invitation email
    
    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error("Error creating invitation:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "An invitation for this email already exists." },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Function to generate a secure token using crypto
function generateToken(): string {
  return randomBytes(32).toString('hex');
}
