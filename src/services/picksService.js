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

export async function getPickById({ pickId }) {
  //Check if the pick ID in the URL is a real number, if not send back an error
  if (Number.isNaN(pickId)) {
    throw new Error("Invalid pick id");
  }

  /* Find the pick, and fetch:
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
    throw new Error("Pick not found");
  }

  // Shape the response nicely
  const home = pick.games.teams_games_home_team_idToteams;
  const away = pick.games.teams_games_away_team_idToteams;
  const selectedTeamCode = pick.winner === "HOME" ? home.code : away.code;

  return {
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
}

export async function createPick({ user_id, game_id, winner, margin }) {
  const normalizedWinner = winner ? winner.toUpperCase() : undefined;

  // Step 1: Validate the user_id, game_id, winner, and margin
  if (!user_id || !game_id || !normalizedWinner || margin === undefined) {
    throw new Error("user_id, game_id, winner, and margin are required");
  }

  // Step 2: Check if winner is valid value
  const validWinners = ["HOME", "AWAY"];
  if (!validWinners.includes(normalizedWinner)) {
    throw new Error('Invalid winner must be "HOME" or "AWAY".');
  }

  // Step 3: Validate margin is a number
  if (isNaN(Number(margin))) {
    throw new Error("Margin must be a numeric value.");
  }

  // Step 4: prevent duplicate pick (same user, same game)
  const existingPick = await prisma.picks.findFirst({
    where: {
      user_id: Number(user_id),
      game_id: Number(game_id),
    },
  });

  if (existingPick) {
    throw new Error("Pick already exists for this user and game");
  }

  // Step 5: Create pick in DB
  return await prisma.picks.create({
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
}

export async function updatePick({ pickId, winner, margin, user }) {
  // Validate :id param
  if (Number.isNaN(pickId)) {
    throw new Error("Invalid pick id");
  }

  // Build an update object
  const dataToUpdate = {};

  // Get the pick, with related game info
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
    const error = new Error("Pick not found");
    error.code = "P2025";
    throw error;
  }

  // Get the pick's user_id and the id of the user who is requesting to update the pick

  /* if the user who requested to update the pick has the same user Id as the user who who orginally created the pick then they must be the owner or is the application's admin.
       "pickRecord.user_id" gets a user id in same record as the pickId given in the URL. 
       "req.user.id" gets the user id that was stored in the JWT when the user logged in.
       req.user.id (or the currently logged in user we get from the JWT) should contain the user id who originally created the pick or it should be the adminstrator of the application.
    */
  const isOwner = pickRecord.user_id === user.id;

  //req.user.role retrieved from the JWT
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new Error("User does not have access to update this pick");
  }

  // Kickoff lock, block edits after game has started
  const now = new Date();
  const kickoff = pickRecord.games.kickoff_at;

  //Validate that the game has not started yet
  //if kickoff is truthy then we check if now >= kickoff, if kickoff is not truthy then now >= kickoff never runs
  if (kickoff && now >= kickoff) {
    throw new Error("The game has started so edits are no longer permitted");
  }

  // If the winner was provided, validate and normalize it
  if (winner !== undefined) {
    const normalizedWinner = winner.toUpperCase();
    const validWinners = ["HOME", "AWAY"];
    if (!validWinners.includes(normalizedWinner)) {
      throw new Error('Invalid winner must be. Must be "HOME" or "AWAY".');
    }
    dataToUpdate.winner = normalizedWinner;
  }

  // If margin was provided, validate margin is numeric
  if (margin !== undefined) {
    if (isNaN(Number(margin))) {
      throw new Error("Margin must be a numeric value.");
    }
    dataToUpdate.margin = Number(margin);
  }

  // If the client didn't send any valid fields, reject the request
  if (Object.keys(dataToUpdate).length === 0) {
    throw new Error("No valid fields provided to update");
  }

  // Update the pick in the database
  return await prisma.picks.update({
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
}
