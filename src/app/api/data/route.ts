import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Handler for GET requests
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }
  try {
    // For now, return a default object until Counter model is confirmed working
    return NextResponse.json(
      { name, display: "", count: 0 }
    );
  } catch (error) {
    console.error("Error in counter endpoint:", error);
    return NextResponse.json(
      { error: "An error occurred in the counter endpoint" },
      { status: 500 }
    );
  }
}

// Handler for POST requests
export async function POST(request: NextRequest) {
  try {
    const { name, display, count } = await request.json();
    if (!name || count === undefined) {
      return NextResponse.json(
        { error: "Name and count are required" },
        { status: 400 }
      );
    }
    
    // Return mock data for now to avoid any Prisma Counter issues
    return NextResponse.json({
      id: 1,
      name,
      display: display || "",
      count
    });
  } catch (error) {
    console.error("Error in counter update endpoint:", error);
    return NextResponse.json(
      { error: "An error occurred in the counter update endpoint" },
      { status: 500 }
    );
  }
}
