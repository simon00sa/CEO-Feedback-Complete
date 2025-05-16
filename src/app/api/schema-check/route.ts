import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Use shared Prisma instance

// Add runtime specification for Vercel deployment
export const runtime = 'nodejs';
export const maxDuration = 30; // Max execution time in seconds

// Define headers for all responses
const headers = {
  'Cache-Control': 'no-store, must-revalidate',
  'Content-Type': 'application/json',
};

// Helper function to capture and log errors
function captureError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
  // Add your error monitoring service here if needed
}

export async function GET(request: NextRequest) {
  try {
    // Only allow on non-production environments unless explicitly requested
    const url = new URL(request.url);
    const forceCheck = url.searchParams.get('force') === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const modelName = url.searchParams.get('model') || 'Invitation';
    
    if (isProduction && !forceCheck) {
      return NextResponse.json({
        success: false,
        message: "Schema inspection disabled in production. Add ?force=true to override."
      }, { status: 403, headers });
    }
    
    // Get the schema information from Prisma
    const dmmf = (prisma as any)._baseDmmf;
    
    if (!dmmf) {
      return NextResponse.json({
        success: false,
        message: "Prisma DMMF not available"
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
          availableModels: dmmf.datamodel?.models?.map((m: any) => m.name) || []
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
    
    // Get database schema version
    let databaseSchema = undefined;
    if (process.env.DATABASE_URL?.includes('postgres')) {
      try {
        const schemaInfo = await prisma.$queryRaw`
          SELECT 
            table_name, 
            column_name, 
            data_type 
          FROM 
            information_schema.columns 
          WHERE 
            table_schema = 'public' 
            AND table_name = ${modelName.toLowerCase()}
        `;
        databaseSchema = schemaInfo;
      } catch (error) {
        console.warn('Could not fetch database schema:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      models: modelData,
      databaseSchema: databaseSchema,
      prismaVersion: prisma._engineConfig?.version || 'unknown',
      message: "Schema information retrieved successfully",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }, { status: 200, headers });
  } catch (error) {
    captureError(error, 'schema-inspect');
    console.error('Error retrieving schema information:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined,
      message: "Failed to retrieve schema information"
    }, { status: 500, headers });
  }
}
