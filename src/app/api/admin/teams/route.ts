import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();

// Helper to check for Admin role
async function isAdmin(request: Request): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session?.user?.role && session.user.role.toUpperCase() === 'ADMIN';
}

// GET /api/admin/teams - Fetch all teams
export async function GET(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
  }

  try {
    const teams = await prisma.team.findMany({
      orderBy: {
        name: 'asc',
      },
      // Optionally include member counts or other relevant data
      // include: { _count: { select: { members: true } } } 
    });
    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: 'Failed to fetch teams.' }, { status: 500 });
  }
}

// POST /api/admin/teams - Create a new team
export async function POST(request: Request) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Forbidden: Requires Admin role.' }, { status: 403 });
  }

  try {
    const { name, displayGroup } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required.' }, { status: 400 });
    }

    // Basic validation for displayGroup if provided
    if (displayGroup !== undefined && (typeof displayGroup !== 'string' || displayGroup.trim().length === 0)) {
       return NextResponse.json({ error: 'Display group name must be a non-empty string if provided.' }, { status: 400 });
    }

    // Check if team name already exists
    const existingTeam = await prisma.team.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } } // Case-insensitive check
    });

    if (existingTeam) {
      return NextResponse.json({ error: `Team with name "${name.trim()}" already exists.` }, { status: 409 }); // 409 Conflict
    }

    const newTeam = await prisma.team.create({
      data: {
        name: name.trim(),
        // Set displayGroup to name if not provided, or use the provided value
        displayGroup: displayGroup?.trim() || name.trim(), 
        // Other fields like memberCount, activeUserCount will be updated by background jobs
      },
    });

    return NextResponse.json(newTeam, { status: 201 });

  } catch (error) {
    console.error("Error creating team:", error);
    // Handle potential Prisma unique constraint errors more gracefully if needed
    if (error.code === 'P2002') { // Prisma unique constraint violation
       return NextResponse.json({ error: 'A team with this name might already exist.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create team.' }, { status: 500 });
  }
}

// TODO: Add PUT /api/admin/teams/[teamId] for updating a team
// TODO: Add DELETE /api/admin/teams/[teamId] for deleting a team (consider implications for users)

