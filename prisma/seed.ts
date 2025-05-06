// prisma/seed.ts
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
