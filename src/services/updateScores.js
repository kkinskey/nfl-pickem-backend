import axios from "axios";
import csvParser from "csv-parser";
import { prisma } from "../lib/db.js";

async function fetchCSV() {
  const url =
    "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";
  const response = await axios.get(url, { responseType: "stream" });

  return new Promise((resolve, reject) => {
    const results = [];
    response.data
      .pipe(csvParser())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

const TEAM_ABBR_MAP = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LV: "Las Vegas Raiders",
  LAC: "Los Angeles Chargers",
  LA: "Los Angeles Rams",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

async function getTeamId(abbr) {
  const fullName = TEAM_ABBR_MAP[abbr] || abbr;
  const team = await prisma.teams.findFirst({
    where: { name: fullName },
    select: { id: true },
  });
  return team?.id || null;
}

export async function updateScores(minSeason = 2024) {
  const games = await fetchCSV();
  let addedCount = 0;
  let skippedCount = 0;

  for (const row of games) {
    const season = parseInt(row.season, 10);
    if (season < minSeason) {
      skippedCount++;
      continue;
    }

    const homeAbbr = row.home_team;
    const awayAbbr = row.away_team;

    const homeId = await getTeamId(homeAbbr);
    const awayId = await getTeamId(awayAbbr);

    if (!homeId || !awayId) {
      console.warn(`Skipping game ${row.game_id}: missing team mapping`);
      skippedCount++;
      continue;
    }

    const homeScore = row.home_score ? parseInt(row.home_score, 10) : null;
    const awayScore = row.away_score ? parseInt(row.away_score, 10) : null;

    // Build kickoff date from gameday + gametime
    let kickoffDate = null;
    if (row.gameday) {
      const timePart =
        row.gametime && row.gametime.trim() !== "" ? row.gametime : "00:00:00";
      kickoffDate = new Date(`${row.gameday}T${timePart}Z`);
    }

    if (!kickoffDate || isNaN(kickoffDate.getTime())) {
      console.warn(`Skipping game ${row.game_id}: invalid date`);
      skippedCount++;
      continue;
    }

    const status =
      homeScore !== null && awayScore !== null ? "FINAL" : "SCHEDULED";

    await prisma.games.upsert({
      where: { external_game_id: row.game_id },
      update: {
        final_home_score: homeScore,
        final_away_score: awayScore,
        status,
        last_synced_at: new Date(),
        teams_games_home_team_idToteams: { connect: { id: homeId } },
        teams_games_away_team_idToteams: { connect: { id: awayId } },
        weeks: {
          connect: {
            season_week_number: {
              season: season,
              week_number: parseInt(row.week, 10),
            },
          },
        },
      },
      create: {
        external_game_id: row.game_id,
        kickoff_at: kickoffDate,
        status,
        source: "nflverse",
        last_synced_at: new Date(),
        teams_games_home_team_idToteams: { connect: { id: homeId } },
        teams_games_away_team_idToteams: { connect: { id: awayId } },
        weeks: {
          connect: {
            season_week_number: {
              season: season,
              week_number: parseInt(row.week, 10),
            },
          },
        },
      },
    });

    addedCount++;
    console.log(
      `✅ Synced game: ${homeAbbr} vs ${awayAbbr} (${homeScore ?? "-"}-${
        awayScore ?? "-"
      })`
    );
  }

  console.log(
    `✅ Finished syncing. ${addedCount} games upserted, ${skippedCount} skipped.`
  );
}
