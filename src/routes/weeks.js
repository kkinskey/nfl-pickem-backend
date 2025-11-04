import { Router } from "express";
import { prisma } from "../lib/db.js";

const router = Router();

// GET Current Week
router.get("/current", async (req, res, next) => {
  try {
    const week = await prisma.weeks.findFirst({
      where: { is_finalized: false },
      orderBy: [{ season: "desc" }, { week_number: "asc" }],
    });

    if (!week) {
      return res.status(404).json({ error: "No current week found" });
    }

    res.json(week);
  } catch (e) {
    next(e);
  }
});

// GET Week Schedule
router.get("/:id/games", async (req, res, next) => {
  try {
    // 1. Parse and validate the week id from URL

    //convert the string "id" to a number. ex: "1" -> 1
    const weekId = Number(req.params.id);

    //Check if the week ID in the URL is a real number if not send back an error
    if (Number.isNaN(weekId)) {
      return res.status(400).json({ error: "Invalid week id" });
    }

    // 2. Make sure the week actually exists
    const week = await prisma.weeks.findUnique({
      where: { id: weekId },
      select: {
        id: true,
        season: true,
        week_number: true,
      },
    });

    if (!week) {
      return res.status(404).json({ error: "Week not found" });
    }

    // 3. Get all games for that week, including home/away teams
    const games = await prisma.games.findMany({
      where: { week_id: weekId },
      include: {
        teams_games_home_team_idToteams: true, // home team info
        teams_games_away_team_idToteams: true, // away team info
      },
      orderBy: [{ kickoff_at: "asc" }],
    });

    // 4. Shape the response nicely
    const schedule = games.map((g) => {
      return {
        game_id: g.id,
        kickoff_at: g.kickoff_at,
        status: g.status,
        home_team: {
          id: g.teams_games_home_team_idToteams.id,
          code: g.teams_games_home_team_idToteams.code,
          name: g.teams_games_home_team_idToteams.name,
        },
        away_team: {
          id: g.teams_games_away_team_idToteams.id,
          code: g.teams_games_away_team_idToteams.code,
          name: g.teams_games_away_team_idToteams.name,
        },
        week: {
          id: week.id,
          season: week.season,
          week_number: week.week_number,
        },
      };
    });

    // 5. Send it back
    return res.status(200).json(schedule);
  } catch (e) {
    next(e);
  }
});

export default router;
