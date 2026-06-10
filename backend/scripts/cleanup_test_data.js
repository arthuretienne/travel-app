// backend/scripts/cleanup_test_data.js
// DEV-ONLY: remove every seeded persona (@skusku-test.dev) and their trips.
// Deleting the trips cascades to members, messages, votes, proposals,
// invitations and expenses.
//
//   DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&pgbouncer=true&connection_limit=1" \
//   node scripts/cleanup_test_data.js

import prisma from '../src/db/prisma.js';

const TEST_DOMAIN = '@skusku-test.dev';

async function main() {
  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: TEST_DOMAIN } },
    select: { id: true, email: true },
  });

  if (testUsers.length === 0) {
    console.log('Nothing to clean — no @skusku-test.dev users found.');
    return;
  }

  const ids = testUsers.map((u) => u.id);

  const trips = await prisma.collaborativeTrip.deleteMany({
    where: { creatorId: { in: ids } },
  });
  const users = await prisma.user.deleteMany({
    where: { id: { in: ids } },
  });

  console.log(`🧹 Removed ${trips.count} trip(s) and ${users.count} test user(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
