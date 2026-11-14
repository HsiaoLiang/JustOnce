// npm run db:seed           → wipe and load the demo data
// npm run db:seed -- --if-empty → only seed a fresh database (used on Vercel deploys)
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/server/seed";
import { DEMO_PASSWORD, USERS } from "../src/server/seed/data";

try {
  process.loadEnvFile(".env");
} catch {
  // Rely on real environment variables.
}

const prisma = new PrismaClient();

async function main() {
  if (process.argv.includes("--if-empty")) {
    const users = await prisma.user.count();
    if (users > 0) {
      console.log(`Database already has ${users} users, skipping seed. Run \`npm run db:seed\` to reset it.`);
      return;
    }
  }
  const started = Date.now();
  const summary = await seedDatabase(prisma);
  console.log(
    `Seeded ${summary.users} users, ${summary.listings} listings, ${summary.bookings} bookings, ${summary.reviews} reviews, ` +
      `${summary.communities} communities and ${summary.posts} board posts ` +
      `(dates relative to ${summary.today}) in ${((Date.now() - started) / 1000).toFixed(1)}s.`,
  );
  console.log(`Demo log-ins (password "${DEMO_PASSWORD}"): ${USERS.slice(0, 2).map((u) => u.email).join(", ")} and more in the README.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
