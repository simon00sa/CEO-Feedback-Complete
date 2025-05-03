import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);
  
  const rolesToCreate = [
    { name: "Staff", description: "Regular team member" },
    { name: "Leadership", description: "Management and leadership roles" },
    { name: "Admin", description: "System administrators with full access" }
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
