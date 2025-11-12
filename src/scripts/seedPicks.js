import { prisma } from "../lib/db.js";

export async function seedTestPicks() {
  const userIds = [1, 2, 3]; // adjust based on your users table
  const gameIds = [1, 2, 3, 4, 5]; // use actual game IDs from your DB

  const picks = [];

  for (const userId of userIds) {
    for (const gameId of gameIds) {
      picks.push({
        user_id: userId,
        game_id: gameId,
        winner: Math.random() > 0.5 ? "HOME" : "AWAY",
        margin: Math.floor(Math.random() * 20),
        score: 0,
        submitted_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  await prisma.picks.createMany({
    data: picks,
    skipDuplicates: true,
  });

  console.log(`✅ Inserted ${picks.length} test picks`);
}

// Run immediately if called directly
if (process.argv[1].endsWith("seedPicks.js")) {
  seedTestPicks()
    .then(() => {
      console.log("✅ Seeding complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
