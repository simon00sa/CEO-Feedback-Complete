import { Prisma } from '@prisma/client';

/**
 * Custom type definition for AnonymitySettings to overcome Prisma type generation issues
 */
export type AnonymitySettingsInput = Omit
  Prisma.AnonymitySettingsCreateInput,
  'enableAnonymousComments' | 'enableAnonymousVotes' | 'enableAnonymousAnalytics'
> & {
  enableAnonymousComments?: boolean;
  enableAnonymousVotes?: boolean;
  enableAnonymousAnalytics?: boolean;
  anonymityLevel?: string;
};

/**
 * Extended type for response including frontend-only fields
 */
export type AnonymitySettingsResponse = Prisma.AnonymitySettingsGetPayload<{}> & {
  enableAnonymousComments: boolean;
  enableAnonymousVotes: boolean;
  enableAnonymousAnalytics: boolean;
  anonymityLevel: string;
};

/**
 * Helper function to filter out fields not in the Prisma schema
 * @param data Input data with potential extra fields
 * @returns Data object compatible with Prisma
 */
export function adaptToPrismaAnonymitySettings(data: Record<string, any>): Prisma.AnonymitySettingsCreateInput {
  // Extract only fields that are in the Prisma schema
  const {
    minGroupSize,
    minActiveUsers,
    activityThresholdDays,
    combinationLogic,
    enableGrouping,
    activityRequirements,
  } = data;
  
  // Validate numeric fields to prevent DB errors
  const validatedMinGroupSize = typeof minGroupSize === 'number' ? 
    Math.max(1, Math.min(1000, minGroupSize)) : 8;
    
  const validatedMinActiveUsers = typeof minActiveUsers === 'number' ? 
    Math.max(1, Math.min(1000, minActiveUsers)) : 5;
    
  const validatedActivityThreshold = typeof activityThresholdDays === 'number' ? 
    Math.max(1, Math.min(365, activityThresholdDays)) : 30;
  
  // Process JSON data safely
  let processedActivityRequirements;
  if (activityRequirements === null || activityRequirements === undefined) {
    processedActivityRequirements = Prisma.JsonNull;
  } else {
    try {
      // Ensure it's valid JSON if it's a string
      if (typeof activityRequirements === 'string') {
        processedActivityRequirements = JSON.parse(activityRequirements);
      } else {
        processedActivityRequirements = activityRequirements;
      }
    } catch (error) {
      console.error("Invalid JSON in activityRequirements:", error);
      processedActivityRequirements = Prisma.JsonNull;
    }
  }
  
  return {
    minGroupSize: validatedMinGroupSize,
    minActiveUsers: validatedMinActiveUsers,
    activityThresholdDays: validatedActivityThreshold,
    combinationLogic: combinationLogic || "DEPARTMENT",
    enableGrouping: enableGrouping !== undefined ? enableGrouping : true,
    activityRequirements: processedActivityRequirements,
  };
}

/**
 * Convert Prisma model to response with frontend fields
 * @param dbModel Database model object
 * @returns Enhanced response with frontend fields
 */
export function adaptToResponseAnonymitySettings(dbModel: Prisma.AnonymitySettingsGetPayload<{}>): AnonymitySettingsResponse {
  return {
    ...dbModel,
    // Add frontend-only fields with default values
    enableAnonymousComments: true,
    enableAnonymousVotes: true,
    enableAnonymousAnalytics: false,
    anonymityLevel: "MEDIUM"
  };
}

/**
 * Type guard to check if a value is a Prisma error
 */
export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Get user-friendly error message from Prisma error
 */
export function getPrismaErrorMessage(error: unknown): string {
  if (isPrismaError(error)) {
    switch(error.code) {
      case 'P2002': return 'A record with this unique constraint already exists.';
      case 'P2025': return 'Record not found.';
      case 'P2003': return 'Foreign key constraint failed.';
      case 'P2000': return 'Input value is too long.';
      default: return `Database error: ${error.code}`;
    }
  }
  return 'An unexpected database error occurred.';
}
