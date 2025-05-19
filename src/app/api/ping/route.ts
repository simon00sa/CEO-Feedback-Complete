import { NextResponse } from "next/server";

// Create a simple ping API route to keep the Netlify function warm
// This prevents cold starts and helps maintain database connections

export const config = {
  runtime: 'edge',
  regions: ['auto'],
};

export async function GET() {
  return NextResponse.json(
    { 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      netlify: process.env.NETLIFY === 'true' ? true : false  
    }, 
    { 
      headers: {
        'Cache-Control': 'no-store, no-cache'
      } 
    }
  );
}
