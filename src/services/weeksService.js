import { prisma } from "../lib/db.js";

export async function getCurrentWeek() {
  const week = await prisma.weeks.findFirst({
    where: { is_finalized: false },
    orderBy: [{ season: "desc" }, { week_number: "asc" }],
  });

  if (!week) {
    throw new Error("No current week found");
  }

  return week;
}

export async function getWeekSchedule({ weekId }) {
  //Check if the week ID in the URL is a real number if not send back an error
  if (Number.isNaN(weekId)) {
    throw new Error("Invalid week id");
  }

  // Make sure the week actually exists
  const week = await prisma.weeks.findUnique({
    where: { id: weekId },
    select: {
      id: true,
      season: true,
      week_number: true,
    },
  });

  if (!week) {
    throw new Error("Week not found");
  }

  // Get all games for that week, including home/away teams
  const games = await prisma.games.findMany({
    where: { week_id: weekId },
    include: {
      teams_games_home_team_idToteams: true, // home team info
      teams_games_away_team_idToteams: true, // away team info
    },
    orderBy: [{ kickoff_at: "asc" }],
  });

  // Shape the response nicely
  return games.map((g) => {
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
}

export async function createWeek({
  season,
  week_number,
  open_at,
  lock_at,
  is_finalized,
  created_at,
  user,
}) {
  // // Step 1: Validate that the user is the ADMIN
  // //req.user.role retrieved from the JWT
  // if (user.role !== "ADMIN") {
  //   throw new Error("User does not have access to create week");
  // }

  // Step 2: prevent duplicate week
  const existingWeek = await prisma.weeks.findFirst({
    where: {
      season: Number(season),
      week_number: Number(week_number),
    },
  });

  if (existingWeek) {
    throw new Error("Week already created");
  }

  // Step 3: Create week in DB
  return await prisma.weeks.create({
    data: {
      season: Number(season),
      week_number: Number(week_number),
    },
    select: {
      id: true,
      season: true,
      week_number: true,
      open_at: true,
      lock_at: true,
      is_finalized: true,
      created_at: true,
    },
  });
}
