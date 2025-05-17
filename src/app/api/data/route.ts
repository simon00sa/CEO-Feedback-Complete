import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Importing Prisma client instance from the project's library

// Handler for GET requests
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch the counter record based on the name
    const counter = await prisma.counter.findUnique({
      where: { name },
    });

    // Return the counter or a default object if not found
    return NextResponse.json(
      counter || { name, display: "", count: 0 }
    );
  } catch (error) {
    console.error("Error fetching counter:", error);
    return NextResponse.json(
      { error: "Failed to fetch counter" },
      { status: 500 }
    );
  }
}

// Handler for POST requests
export async function POST(request: Request) {
  try {
    const { name, display, count } = await request.json();

    if (!name || count === undefined) {
      return NextResponse.json(
        { error: "Name and count are required" },
        { status: 400 }
      );
    }

    // Upsert the counter record
    const counter = await prisma.counter.upsert({
      where: { name },
      update: { count, display },
      create: { name, display: display || "", count },
    });

    return NextResponse.json(counter);
  } catch (error) {
    console.error("Error updating counter:", error);
    return NextResponse.json(
      { error: "Failed to update counter" },
      { status: 500 }
    );
  }
}
