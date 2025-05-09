import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a new PrismaClient instance
const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get the schema information from Prisma
    const dmmf = (prisma as any)._baseDmmf;
    
    // Extract Invitation model fields
    const invitationModel = dmmf?.datamodel?.models?.find(
      (model: any) => model.name === 'Invitation'
    );
    
    // Get the fields from the Invitation model
    const invitationFields = invitationModel?.fields?.map((field: any) => ({
      name: field.name,
      type: field.type,
      isRequired: field.isRequired,
      kind: field.kind,
      relationName: field.relationName,
    }));
    
    // Return the model information
    return NextResponse.json({
      invitationModel: invitationFields,
      message: "Schema information retrieved successfully"
    });
  } catch (error) {
    console.error('Error retrieving schema information:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to retrieve schema information"
    }, { status: 500 });
  }
}
