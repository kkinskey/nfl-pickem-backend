import { prisma } from "../lib/db.js";

export async function getPicks({ userId, season, week }) {
  // “Find picks, and for each one, also fetch:
  // 1. the user who made it (with limited fields),
  // 2. the game info, the game’s week, and
  // 3. both the home and away teams.”

  const picks = await prisma.picks.findMany({
    where: {
      ...(userId ? { user_id: userId } : {}),
      ...(season && week
        ? {
            games: {
              weeks: { season, week_number: week },
            },
          }
        : {}),
    },
    include: {
      users: { select: { id: true, display_name: true, email: true } },
      games: {
        include: {
          weeks: true,
          teams_games_home_team_idToteams: true, // home team
          teams_games_away_team_idToteams: true, // away team
        },
      },
    },
    orderBy: [{ id: "asc" }],
  });

  // shape a clean response
  return picks.map((p) => {
    const home = p.games.teams_games_home_team_idToteams;
    const away = p.games.teams_games_away_team_idToteams;
    const selectedTeamCode = p.winner === "HOME" ? home.code : away.code;

    return {
      id: p.id,
      user: {
        id: p.users.id,
        name: p.users.display_name,
        email: p.users.email,
      },
      game: {
        id: p.games.id,
        season: p.games.weeks.season,
        week: p.games.weeks.week_number,
        home: { id: home.id, code: home.code, name: home.name },
        away: { id: away.id, code: away.code, name: away.name },
        kickoff_at: p.games.kickoff_at,
        status: p.games.status,
      },
      pick: {
        winner_side: p.winner, // 'HOME' | 'AWAY'
        selected_team: selectedTeamCode,
        margin: p.margin,
        score: p.score,
        submitted_at: p.submitted_at,
        updated_at: p.updated_at,
      },
    };
  });
}
