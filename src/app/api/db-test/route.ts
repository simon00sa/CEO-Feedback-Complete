import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a new Prisma client instance
const prisma = new PrismaClient();

export async function GET() {
  try {
    // Test the database connection with a simple query
    const connectionTest = await prisma.$queryRaw`SELECT 1 as connected`;
    
    // Check if tables exist in the public schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    return NextResponse.json({
      success: true,
      connection: connectionTest,
      tables: tables,
      message: "Database connection successful"
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      message: "Failed to connect to the database"
    }, { status: 500 });
  }
}
