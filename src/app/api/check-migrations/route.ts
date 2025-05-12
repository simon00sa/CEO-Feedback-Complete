import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connection
    const dbTest = await prisma.$queryRaw`SELECT 1 as connected`;
    
    // Get a list of database tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    // Check Invitation table columns
    const invitationColumns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Invitation'
    `;
    
    // Get Prisma dmmf info for debugging
    const dmmf = (prisma as any)._baseDmmf;
    const invitationModel = dmmf?.datamodel?.models?.find(
      (model: any) => model.name === 'Invitation'
    );
    
    // Get model fields
    const invitationFields = invitationModel?.fields?.map((field: any) => ({
      name: field.name,
      type: field.type,
      kind: field.kind,
      isRequired: field.isRequired,
    }));
    
    // Use a direct object for testing without Prisma validator
    const createTestValid = {
      email: "test@example.com",
      inviterId: "test-id",
      roleId: "test-role-id",
      token: "test-token",
      status: "PENDING",
      orgId: "test-org-id",
      expires: new Date(),
      used: false,
    };
    
    return NextResponse.json({
      dbConnection: dbTest,
      tables,
      invitationColumns,
      prismaModel: {
        modelExists: !!invitationModel,
        fields: invitationFields,
      },
      validationTest: {
        structure: createTestValid,
        valid: true
      },
      message: "Migration check completed"
    });
  } catch (error) {
    console.error('Error checking migrations:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      message: "Failed to check migrations"
    }, { status: 500 });
  }
}
