import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Use shared Prisma instance

// Adjust runtime specification for Netlify deployment
export const runtime = 'nodejs';
export const maxDuration = 25; // Below Netlify's 26-second limit

// Define headers for all responses with Netlify-specific cache tags
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
  'X-Netlify-Cache-Tag': 'schema-inspector'
};

// Helper function to capture and log errors with Netlify context
function captureError(error: unknown, context: string) {
  console.error(`[Netlify:${context}]`, error);
  // Add your error monitoring service here if needed
}

// Timeout constant for database operations
const TIMEOUT = 8000; // 8 seconds (appropriate for Netlify functions)

// Helper function to add timeout to promises
async function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]) as Promise<T>;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Only allow on non-production environments unless explicitly requested
    const url = new URL(request.url);
    const forceCheck = url.searchParams.get('force') === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const modelName = url.searchParams.get('model') || 'Invitation';
    const netlifyContext = process.env.CONTEXT || 'unknown';
    
    if (isProduction && !forceCheck) {
      return NextResponse.json({
        success: false,
        message: "Schema inspection disabled in production. Add ?force=true to override."
      }, { status: 403, headers });
    }
    
    // Get the schema information from Prisma
    // We use a try/catch here as DMMF access can sometimes fail in serverless
    let dmmf;
    try {
      dmmf = (prisma as any)._baseDmmf;
    } catch (dmmfError) {
      captureError(dmmfError, 'schema-dmmf-access');
      
      // Fallback to a more resilient approach for Netlify functions
      try {
        // Try to access client object which may be more reliable in serverless
        dmmf = (prisma as any)._clientEngineType?.dmmf || 
               (prisma as any)._engineConfig?.document?.dmmf;
      } catch (fallbackError) {
        captureError(fallbackError, 'schema-dmmf-fallback');
      }
    }
    
    if (!dmmf) {
      return NextResponse.json({
        success: false,
        message: "Prisma DMMF not available in Netlify function",
        netlifyContext,
        timestamp: new Date().toISOString()
      }, { status: 500, headers });
    }
    
    // Get info for all models or specific model
    let modelData = [];
    
    if (modelName === '*') {
      // Get all models
      modelData = dmmf.datamodel?.models?.map((model: any) => ({
        name: model.name,
        fields: model.fields?.map((field: any) => ({
          name: field.name,
          type: field.type,
          isRequired: field.isRequired,
          kind: field.kind,
          relationName: field.relationName,
          isList: field.isList,
          isId: field.isId,
          isUnique: field.isUnique,
          hasDefaultValue: !!field.default,
          dbNames: field.dbNames,
        })),
        dbName: model.dbName,
        uniqueFields: model.uniqueFields,
        uniqueIndexes: model.uniqueIndexes,
      })) || [];
    } else {
      // Get specific model
      const specificModel = dmmf.datamodel?.models?.find(
        (model: any) => model.name === modelName
      );
      
      if (!specificModel) {
        return NextResponse.json({
          success: false,
          message: `Model '${modelName}' not found in schema`,
          availableModels: dmmf.datamodel?.models?.map((m: any) => m.name) || [],
          netlifyContext,
          responseTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }, { status: 404, headers });
      }
      
      modelData = [{
        name: specificModel.name,
        fields: specificModel.fields?.map((field: any) => ({
          name: field.name,
          type: field.type,
          isRequired: field.isRequired,
          kind: field.kind,
          relationName: field.relationName,
          isList: field.isList,
          isId: field.isId,
          isUnique: field.isUnique,
          hasDefaultValue: !!field.default,
          dbNames: field.dbNames,
        })),
        dbName: specificModel.dbName,
        uniqueFields: specificModel.uniqueFields,
        uniqueIndexes: specificModel.uniqueIndexes,
      }];
    }
    
    // Get database schema version, with timeout and error handling for Netlify
    let databaseSchema = undefined;
    if (process.env.DATABASE_URL?.includes('postgres')) {
      try {
        // Use withTimeout to prevent hanging the serverless function
        databaseSchema = await withTimeout(
          prisma.$queryRaw`
            SELECT 
              table_name, 
              column_name, 
              data_type 
            FROM 
              information_schema.columns 
            WHERE 
              table_schema = 'public' 
              AND table_name = ${modelName.toLowerCase()}
          `,
          6000 // 6 second timeout for this specific query
        );
      } catch (dbError) {
        captureError(dbError, 'schema-db-query');
        console.warn('Could not fetch database schema:', dbError);
        
        // Include error info in the response but don't fail the request
        databaseSchema = { 
          error: dbError instanceof Error ? dbError.message : String(dbError),
          note: "Unable to fetch schema from database, but Prisma schema is still available above"
        };
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      models: modelData,
      databaseSchema: databaseSchema,
      prismaVersion: prisma._engineConfig?.version || 'unknown',
      netlifySpecific: {
        context: netlifyContext,
        buildId: process.env.BUILD_ID || 'unknown',
        deployId: process.env.DEPLOY_ID || 'unknown',
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown'
      },
      performance: {
        responseTimeMs: responseTime,
        status: responseTime < 500 ? 'good' : responseTime < 2000 ? 'moderate' : 'slow'
      },
      message: "Schema information retrieved successfully",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 200, headers });
  } catch (error) {
    captureError(error, 'schema-inspect');
    console.error('Error retrieving schema information:', error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined,
      netlifyContext: process.env.CONTEXT || 'unknown',
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString(),
      message: "Failed to retrieve schema information"
    }, { status: 500, headers });
  }
}
