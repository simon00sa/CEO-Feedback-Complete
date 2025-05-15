import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Validation schema for team creation
const TeamCreateSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  displayGroup: z.string().optional(),
});

// Helper to check for Admin role
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  });
  
  return !!user && user.role?.name?.toUpperCase() === 'ADMIN';
}

// GET /api/admin/teams - Fetch all teams
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
    }
    
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: true } } }
    });
    
    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: 'Failed to fetch teams.' }, { status: 500 });
  }
}

// POST /api/admin/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
    }
    
    const body = await request.json();
    const validatedData = TeamCreateSchema.parse(body);
    
    const { name, displayGroup } = validatedData;
    const trimmedName = name.trim();
    const trimmedDisplayGroup = displayGroup?.trim() || trimmedName;
    
    const existingTeam = await prisma.team.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } }
    });
    
    if (existingTeam) {
      return NextResponse.json({ error: `Team with name "${trimmedName}" already exists.` }, { status: 409 });
    }
    
    const newTeam = await prisma.team.create({
      data: {
        name: trimmedName,
        displayGroup: trimmedDisplayGroup,
        isAnonymous: true,
        lastActiveCheck: new Date(),
      },
    });
    
    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error("Error creating team:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A team with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create team.' }, { status: 500 });
  }
}

// PUT /api/admin/teams/[teamId] - Update a team
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
    }
    
    const url = new URL(request.url);
    const teamId = url.pathname.split('/').pop();
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400 });
    }
    
    const body = await request.json();
    const validatedData = TeamCreateSchema.parse(body);
    
    const { name, displayGroup } = validatedData;
    const trimmedName = name.trim();
    const trimmedDisplayGroup = displayGroup?.trim() || trimmedName;
    
    const existingTeam = await prisma.team.findUnique({ where: { id: teamId } });
    
    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }
    
    if (trimmedName !== existingTeam.name) {
      const nameConflict = await prisma.team.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' }, id: { not: teamId } }
      });
      if (nameConflict) {
        return NextResponse.json({ error: `Team with name "${trimmedName}" already exists.` }, { status: 409 });
      }
    }
    
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: trimmedName,
        displayGroup: trimmedDisplayGroup,
      },
    });
    
    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update team.' }, { status: 500 });
  }
}

// DELETE /api/admin/teams/[teamId] - Delete a team
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
    }
    
    const url = new URL(request.url);
    const teamId = url.pathname.split('/').pop();
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400 });
    }
    
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: { _count: { select: { members: true } } }
    });
    
    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }
    
    if (existingTeam._count.members > 0) {
      return NextResponse.json({ error: 'Cannot delete team with active members. Please reassign members first.', memberCount: existingTeam._count.members }, { status: 400 });
    }
    
    await prisma.team.delete({ where: { id: teamId } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete team.' }, { status: 500 });
  }
}
