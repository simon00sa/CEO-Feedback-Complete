import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for validation
const AnonymitySettingsSchema = z.object({
  enableAnonymousComments: z.boolean(),
  enableAnonymousVotes: z.boolean(),
  enableAnonymousAnalytics: z.boolean(),
  anonymityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

type AnonymitySettingsBody = z.infer<typeof AnonymitySettingsSchema>;

// Helper function to check if user is admin
async function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

// GET /api/admin/anonymity-settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(await isAdmin(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.anonymitySettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = await prisma.anonymitySettings.create({
        data: {
          enableAnonymousComments: true,
          enableAnonymousVotes: true,
          enableAnonymousAnalytics: false,
          anonymityLevel: 'MEDIUM',
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
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(await isAdmin(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = AnonymitySettingsSchema.parse(body);

    const settings = await prisma.anonymitySettings.upsert({
      where: { id: 1 },
      update: validatedData,
      create: validatedData,
    });

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
