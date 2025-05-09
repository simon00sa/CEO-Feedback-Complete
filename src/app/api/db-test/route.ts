import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    
    // Check if the Role table has any data
    const roles = await prisma.role.findMany();
    
    return NextResponse.json({
      success: true,
      connection: connectionTest,
      tables: tables,
      roles: roles,
      message: "Database connection successful"
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to connect to the database"
    }, { status: 500 });
  }
}
