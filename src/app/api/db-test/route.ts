// src/app/api/db-test/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Adjust this path to your Prisma client

export async function GET() {
  try {
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    // Check if any tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    return NextResponse.json({ 
      success: true, 
      result,
      tables
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
