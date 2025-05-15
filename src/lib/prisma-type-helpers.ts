import { Prisma } from '@prisma/client';

/**
 * Custom type definition for AnonymitySettings to overcome Prisma type generation issues
 */
export type AnonymitySettingsInput = Omit<
  Prisma.AnonymitySettingsCreateInput,
  'enableAnonymousComments' | 'enableAnonymousVotes' | 'enableAnonymousAnalytics'
> & {
  enableAnonymousComments?: boolean;
  enableAnonymousVotes?: boolean;
  enableAnonymousAnalytics?: boolean;
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
    anonymityLevel,
  } = data;

  return {
    minGroupSize,
    minActiveUsers,
    activityThresholdDays,
    combinationLogic,
    enableGrouping,
    activityRequirements: activityRequirements ?? Prisma.JsonNull,
    anonymityLevel,
  };
}
