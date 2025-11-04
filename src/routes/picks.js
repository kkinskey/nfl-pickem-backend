import { Router } from "express";
import { prisma } from "../lib/db.js";
import { authenticateToken } from "../middleware/auth.js";
import { getPicks } from "../services/picksService.js";

const router = Router();
// GET View Picks
router.get("/", async (req, res, next) => {
  try {
    /*
      Extract and convert a query parameter from an HTTP request
      
      EX:
       req.query.userId - Checks if the userId query parameter exists in the request URL.
       Number(req.query.userId) - Converts the string value to a number
       : undefined - If userId is not provided, it defaults to undefined
    */
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const season = req.query.season ? Number(req.query.season) : undefined;
    const week = req.query.week ? Number(req.query.week) : undefined;

    // Calls the service function, getPicks(), and passes in filters (userId, season, week) to retrieve and shape pick data from database.
    const result = await getPicks({ userId, season, week });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// GET View 1 pick
router.get("/:id", async (req, res, next) => {
  try {
    // 1. Parse and validate the pick id from the URL
    // convert the string "id" to a number
    const pickId = Number(req.params.id);
    // optional filters: ?userId=1&season=2025&week=1
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const season = req.query.season ? Number(req.query.season) : undefined;
    const week = req.query.week ? Number(req.query.week) : undefined;

    //Check if the pick ID in the URL is a real number, if not send back an error
    if (Number.isNaN(pickId)) {
      return res.status(400).json({ error: "Invalid pick id" });
    }

    /* 2. Find the pick, and fetch:
        2.1 the user who made it (with limited fields),
        2.2 the game info, the game’s week, and
        2.3 both the home and away teams.”
    */

    const pick = await prisma.picks.findUnique({
      where: { id: pickId },
      include: {
        users: {
          select: { id: true, display_name: true, email: true },
        },
        games: {
          include: {
            weeks: true,
            teams_games_home_team_idToteams: true,
            teams_games_away_team_idToteams: true,
          },
        },
      },
    });

    if (!pick) {
      return res.status(404).json({ error: "Pick not found" });
    }

    // 3. Shape the response nicely
    const home = pick.games.teams_games_home_team_idToteams;
    const away = pick.games.teams_games_away_team_idToteams;
    const selectedTeamCode = pick.winner === "HOME" ? home.code : away.code;

    const responseBody = {
      id: pick.id,
      user: {
        id: pick.users.id,
        name: pick.users.display_name,
        email: pick.users.email,
      },
      game: {
        id: pick.games.id,
        season: pick.games.weeks.season,
        week: pick.games.weeks.week_number,
        home: { id: home.id, code: home.code, name: home.name },
        away: { id: away.id, code: away.code, name: away.name },
        kickoff_at: pick.games.kickoff_at,
        status: pick.games.status,
      },
      pick: {
        winner_side: pick.winner,
        selected_team: selectedTeamCode,
        margin: pick.margin,
        score: pick.score,
        submitted_at: pick.submitted_at,
        updated_at: pick.updated_at,
      },
    };

    return res.status(200).json(responseBody);
  } catch (e) {
    next(e);
  }
});

// POST Create Picks
router.post("/add", async (req, res, next) => {
  try {
    const { user_id, game_id, winner, margin } = req.body;
    const normalizedWinner = winner ? winner.toUpperCase() : undefined;

    // Step 1: Validate the user_id, game_id, winner, and margin
    if (!user_id || !game_id || !normalizedWinner || margin === undefined) {
      return res
        .status(400)
        .json({ error: "user_id, game_id, winner, and margin are required" });
    }

    // Step 2: Check if winner is valid value
    const validWinners = ["HOME", "AWAY"];
    if (!validWinners.includes(normalizedWinner)) {
      return res
        .status(400)
        .json({ error: 'Invalid winner must be "HOME" or "AWAY".' });
    }

    // Step 3: Validate margin is a number
    if (isNaN(Number(margin))) {
      return res.status(400).json({ error: "Margin must be a numeric value." });
    }

    // Step 4: prevent duplicate pick (same user, same game)
    const existingPick = await prisma.picks.findFirst({
      where: {
        user_id: Number(user_id),
        game_id: Number(game_id),
      },
    });

    if (existingPick) {
      return res.status(409).json({
        error: "Pick already exists for this user and game",
      });
    }

    // Step 5: Create pick in DB
    const newPick = await prisma.picks.create({
      data: {
        user_id: Number(user_id),
        game_id: Number(game_id),
        winner: normalizedWinner, // save normalized "HOME"/"AWAY"
        margin: Number(margin),
      },
      select: {
        id: true,
        user_id: true,
        game_id: true,
        winner: true,
        margin: true,
        submitted_at: true,
      },
    });
    res.status(201).json(newPick);
  } catch (e) {
    next(e);
  }
});

//PATCH /updatePick
router.patch("/:id", authenticateToken, async (req, res, next) => {
  try {
    // Step 1: Validate :id param
    const pickId = Number(req.params.id); ////Convert the id from a string to a number
    if (Number.isNaN(pickId)) {
      return res.status(400).json({ error: "Invalid pick id" });
    }

    // Step 2: Pull the allowed fields from the request body
    const { winner, margin } = req.body;

    // Step 3: Build an update object
    const dataToUpdate = {};

    // Step 4: Get the pick, with related game info
    const pickRecord = await prisma.picks.findUnique({
      where: { id: pickId },
      include: {
        games: {
          select: {
            kickoff_at: true,
          },
        },
      },
    });

    if (!pickRecord) {
      return res.status(404).json({ error: "Pick not found" });
    }
    // Step 5: Get the pick's user_id and the id of the user who is requesting to update the pick

    /* if the user who requested to update the pick has the same user Id as the user who who orginally created the pick then they must be the owner or is the application's admin.
       "pickRecord.user_id" gets a user id in same record as the pickId given in the URL. 
       "req.user.id" gets the user id that was stored in the JWT when the user logged in.
       req.user.id (or the currently logged in user we get from the JWT) should contain the user id who originally created the pick or it should be the adminstrator of the application.
    */
    const isOwner = pickRecord.user_id === req.user.id;

    //req.user.role retrieved from the JWT
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res
        .status(403) // 403 Forbidden
        .json({ error: "User does not have access to update this pick" });
    }

    // Step 6: Kickoff lock, block edits after game has started
    const now = new Date();
    const kickoff = pickRecord.games.kickoff_at;

    //Validate that the game has not started yet
    //if kickoff is truthy then we check if now >= kickoff, if kickoff is not truthy then now >= kickoff never runs
    if (kickoff && now >= kickoff) {
      return res.status(403).json({
        error: "The game has started so edits are no longer permitted",
      });
    }

    // Step 7: If the winner was provided, validate and normalize it
    if (winner !== undefined) {
      const normalizedWinner = winner.toUpperCase();
      const validWinners = ["HOME", "AWAY"];
      if (!validWinners.includes(normalizedWinner)) {
        return res
          .status(400)
          .json({ error: 'Invalid winner must be. Must be "HOME" or "AWAY".' });
      }
      dataToUpdate.winner = normalizedWinner;
    }

    // Step 8: If margin was provided, validate margin is numeric
    if (margin !== undefined) {
      if (isNaN(Number(margin))) {
        return res
          .status(400)
          .json({ error: "Margin must be a numeric value." });
      }
      dataToUpdate.margin = Number(margin);
    }

    // Step 9: If the client didn't send any valid fields, reject the request
    if (Object.keys(dataToUpdate).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided to update" });
    }

    // Step 10: Update the pick in the database
    //
    const logged_in_user = req.user.id;
    const updatedPick = await prisma.picks.update({
      where: { id: pickId },
      data: dataToUpdate,
      select: {
        id: true,
        user_id: true,
        game_id: true,
        winner: true,
        margin: true,
        score: true,
        submitted_at: true,
        updated_at: true,
      },
    });

    // Step 11: Success response
    return res.status(200).json({ message: "Pick updated", pick: updatedPick });
  } catch (e) {
    // Handle "record to update not found"
    if (e.code === "P2025") {
      return res.status(404).json({ error: "Pick not found" });
    }

    next(e);
  }
});

export default router;
