import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const counter = await prisma.counter.findUnique({
      where: { name },
    });
    return NextResponse.json(counter || { name, display: "", count: 0 });
  } catch (error) {
    console.error("Error fetching counter:", error);
    return NextResponse.json({ error: "Failed to fetch counter" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { name, display, count } = await request.json();

  if (!name || count === undefined) {
    return NextResponse.json({ error: "Name and count are required" }, { status: 400 });
  }

  try {
    const counter = await prisma.counter.upsert({
      where: { name },
      update: { count, display },
      create: { name, display: display || "", count },
    });
    return NextResponse.json(counter);
  } catch (error) {
    console.error("Error updating counter:", error);
    return NextResponse.json({ error: "Failed to update counter" }, { status: 500 });
  }
}
