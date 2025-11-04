import { Router } from "express";
import { prisma } from "../lib/db.js";

const router = Router();

// GET game details
router.get("/:id", async (req, res, next) => {
  try {
    // 1. Parse and validate the game id from the URL
    //convert the string "id" to a number.
    const gameId = Number(req.params.id);

    // Check if the week ID in the URL is a real number if not send back an error
    if (Number.isNaN(gameId)) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    // 2. Make sure the game actually exists in the database
    const game = await prisma.games.findUnique({
      where: { id: gameId },
      include: {
        weeks: true,
        teams_games_home_team_idToteams: true,
        teams_games_away_team_idToteams: true,
      },
    });

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // 3. Shape the response nicely
    const responseBody = {
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
    return res.status(200).json(responseBody);
  } catch (e) {
    next(e);
  }
});

export default router;
