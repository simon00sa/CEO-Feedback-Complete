// prisma/seed.ts
// Remove the unused PrismaClient import
import prisma from '../src/lib/prisma';

async function main() {
  console.log(`Start seeding ...`);
  
  // Create default roles
  const rolesToCreate = [
    { name: "ADMIN", description: "System administrators with full access" },
    { name: "LEADERSHIP", description: "Management and leadership roles" },
    { name: "STAFF", description: "Regular team member" }
  ];
  
  for (const roleData of rolesToCreate) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        name: roleData.name,
      },
    });
    console.log(`Created or found role with id: ${role.id} (${role.name})`);
  }
  
  // Create default anonymity settings if they don't exist
  const existingSettings = await prisma.anonymitySettings.findFirst();
  
  if (!existingSettings) {
    const settings = await prisma.anonymitySettings.create({
      data: {
        enableAnonymousComments: true,
        enableAnonymousVotes: true,
        enableAnonymousAnalytics: false,
        anonymityLevel: 'MEDIUM',
        minGroupSize: 8,
        minActiveUsers: 5,
        activityThresholdDays: 30,
        combinationLogic: 'DEPARTMENT',
        enableGrouping: true,
      },
    });
    console.log(`Created default anonymity settings with id: ${settings.id}`);
  }
  
  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
