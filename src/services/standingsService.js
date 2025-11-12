import { prisma } from "../lib/db.js";

export async function calculateWeeklyStandings(week_id) {
  try {
    // Validate and normalize week_id to a number
    const weekIdNum = Number(week_id);
    if (!weekIdNum || isNaN(weekIdNum)) {
      throw new Error("Invalid or missing week_id");
    }

    // 1. Fetch all finalized games for the week
    const games = await prisma.games.findMany({
      where: { week_id: weekIdNum, status: "FINAL" },
      select: {
        id: true,
        final_home_score: true,
        final_away_score: true,
      },
    });

    if (games.length === 0) {
      throw new Error(`No finalized games found for week ${weekIdNum}`);
    }

    // 2. Build a lookup map of game_id => actual winner ("HOME", "AWAY", or null for tie)
    const gameResults = new Map();
    for (const game of games) {
      if (game.final_home_score == null || game.final_away_score == null)
        continue;
      const winner =
        game.final_home_score > game.final_away_score
          ? "HOME"
          : game.final_home_score < game.final_away_score
          ? "AWAY"
          : null; // tie
      gameResults.set(game.id, winner);
    }

    // 3. Fetch all picks for those finalized games
    const picks = await prisma.picks.findMany({
      where: { game_id: { in: Array.from(gameResults.keys()) } },
    });

    if (picks.length === 0) {
      throw new Error(
        `No picks found for finalized games in week ${weekIdNum}`
      );
    }

    // 4. Compare picks to actual winners and calculate scores per user
    const userScores = {}; // { [userId]: score }
    for (const pick of picks) {
      const actualWinner = gameResults.get(pick.game_id);
      const isCorrect = actualWinner && pick.winner === actualWinner;
      const points = isCorrect ? 1 : 0;

      // Accumulate score
      if (!userScores[pick.user_id]) userScores[pick.user_id] = 0;
      userScores[pick.user_id] += points;

      // Persist pick score (best-effort; failures are logged)
      try {
        await prisma.picks.update({
          where: { id: pick.id },
          data: { score: points },
        });
      } catch (e) {
        console.error(`Failed to update score for pick ${pick.id}:`, e.message);
      }
    }

    // 5. Upsert standings rows and prepare output with display names
    const standingsOutput = [];

    // First upsert all standings (so DB state is consistent)
    for (const [user_id, score] of Object.entries(userScores)) {
      try {
        await prisma.standings.upsert({
          where: {
            user_id_week_id: {
              user_id: Number(user_id),
              week_id: weekIdNum,
            },
          },
          update: { score },
          create: { user_id: Number(user_id), week_id: weekIdNum, score },
        });
      } catch (e) {
        console.error(
          `Failed to upsert standings for user ${user_id}:`,
          e.message
        );
      }
    }

    // Fetch all involved users in one query to avoid N+1
    const userIds = Object.keys(userScores).map((id) => Number(id));
    const users =
      userIds.length > 0
        ? await prisma.users.findMany({
            where: { id: { in: userIds } },
            select: { id: true, display_name: true },
          })
        : [];

    const nameById = new Map(
      users.map((u) => [u.id, u.display_name || "Unknown"])
    );

    // Build final output array
    for (const [user_id, score] of Object.entries(userScores)) {
      const uid = Number(user_id);
      standingsOutput.push({
        user_id: uid,
        display_name: nameById.get(uid) || "Unknown",
        score,
      });
    }

    // 6. Mark week as finalized
    try {
      await prisma.weeks.update({
        where: { id: weekIdNum },
        data: { is_finalized: true },
      });
    } catch (e) {
      console.error(`Failed to mark week ${weekIdNum} finalized:`, e.message);
    }

    // Sort standings by score descending before returning
    standingsOutput.sort((a, b) => b.score - a.score);

    return {
      week_id: weekIdNum,
      standings: standingsOutput,
    };
  } catch (error) {
    console.error("Error in calculateWeeklyStandings:", error.message);
    throw error;
  }
}

export async function calculateOverallStandings() {
  try {
    // 1) Aggregate total scores per user from standings table
    const aggregates = await prisma.standings.groupBy({
      by: ["user_id"],
      _sum: { score: true },
      orderBy: { _sum: { score: "desc" } },
    });

    if (aggregates.length === 0) {
      throw new Error("No standings data available");
    }

    // 2) Collect user IDs and fetch display names in one query to avoid N+1
    const userIds = aggregates.map((a) => a.user_id);
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, display_name: true },
    });

    const nameById = new Map(
      users.map((u) => [u.id, u.display_name || "Unknown"])
    );

    // 3) Compose final output: include user_id, display_name, and total_score
    const results = aggregates.map((a) => ({
      user_id: a.user_id,
      display_name: nameById.get(a.user_id) || "Unknown",
      total_score: a._sum.score ?? 0,
    }));

    // Ensure sorted by total_score descending (groupBy orderBy usually covers this)
    results.sort((x, y) => (y.total_score ?? 0) - (x.total_score ?? 0));

    return results;
  } catch (error) {
    console.error("Error in calculateOverallStandings:", error.message);
    throw error;
  }
}
