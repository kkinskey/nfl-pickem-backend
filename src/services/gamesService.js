import { prisma } from "../lib/db.js";
export async function getGameById({ gameId }) {
  // Check if the week ID in the URL is a real number if not send back an error
  if (Number.isNaN(gameId)) {
    throw new Error("Invalid game id");
  }

  // Make sure the game actually exists in the database
  const game = await prisma.games.findUnique({
    where: { id: gameId },
    include: {
      weeks: true,
      teams_games_home_team_idToteams: true,
      teams_games_away_team_idToteams: true,
    },
  });

  if (!game) {
    throw new Error("Game not found");
  }

  // Shape the response nicely
  return {
    id: game.id,
    season: game.weeks.season,
    week_number: game.weeks.week_number,
    kickoff_at: game.kickoff_at,
    status: game.status,
    final_score: {
      home: game.final_home_score ?? null,
      away: game.final_away_score ?? null,
    },
    home_team: {
      id: game.teams_games_home_team_idToteams.id,
      code: game.teams_games_home_team_idToteams.code,
      name: game.teams_games_home_team_idToteams.name,
    },
    away_team: {
      id: game.teams_games_away_team_idToteams.id,
      code: game.teams_games_away_team_idToteams.code,
      name: game.teams_games_away_team_idToteams.name,
    },
  };
}
