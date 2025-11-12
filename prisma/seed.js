import { prisma } from "../src/lib/db.js"; // adjust path if needed

async function main() {
  // --- Seed Teams ---
  const teams = [
    {
      code: "ARI",
      name: "Arizona Cardinals",
      conference: "NFC",
      division: "West",
    },
    {
      code: "ATL",
      name: "Atlanta Falcons",
      conference: "NFC",
      division: "South",
    },
    {
      code: "BAL",
      name: "Baltimore Ravens",
      conference: "AFC",
      division: "North",
    },
    { code: "BUF", name: "Buffalo Bills", conference: "AFC", division: "East" },
    {
      code: "CAR",
      name: "Carolina Panthers",
      conference: "NFC",
      division: "South",
    },
    {
      code: "CHI",
      name: "Chicago Bears",
      conference: "NFC",
      division: "North",
    },
    {
      code: "CIN",
      name: "Cincinnati Bengals",
      conference: "AFC",
      division: "North",
    },
    {
      code: "CLE",
      name: "Cleveland Browns",
      conference: "AFC",
      division: "North",
    },
    {
      code: "DAL",
      name: "Dallas Cowboys",
      conference: "NFC",
      division: "East",
    },
    {
      code: "DEN",
      name: "Denver Broncos",
      conference: "AFC",
      division: "West",
    },
    {
      code: "DET",
      name: "Detroit Lions",
      conference: "NFC",
      division: "North",
    },
    {
      code: "GB",
      name: "Green Bay Packers",
      conference: "NFC",
      division: "North",
    },
    {
      code: "HOU",
      name: "Houston Texans",
      conference: "AFC",
      division: "South",
    },
    {
      code: "IND",
      name: "Indianapolis Colts",
      conference: "AFC",
      division: "South",
    },
    {
      code: "JAX",
      name: "Jacksonville Jaguars",
      conference: "AFC",
      division: "South",
    },
    {
      code: "KC",
      name: "Kansas City Chiefs",
      conference: "AFC",
      division: "West",
    },
    {
      code: "LV",
      name: "Las Vegas Raiders",
      conference: "AFC",
      division: "West",
    },
    {
      code: "LAC",
      name: "Los Angeles Chargers",
      conference: "AFC",
      division: "West",
    },
    {
      code: "LAR",
      name: "Los Angeles Rams",
      conference: "NFC",
      division: "West",
    },
    {
      code: "MIA",
      name: "Miami Dolphins",
      conference: "AFC",
      division: "East",
    },
    {
      code: "MIN",
      name: "Minnesota Vikings",
      conference: "NFC",
      division: "North",
    },
    {
      code: "NE",
      name: "New England Patriots",
      conference: "AFC",
      division: "East",
    },
    {
      code: "NO",
      name: "New Orleans Saints",
      conference: "NFC",
      division: "South",
    },
    {
      code: "NYG",
      name: "New York Giants",
      conference: "NFC",
      division: "East",
    },
    { code: "NYJ", name: "New York Jets", conference: "AFC", division: "East" },
    {
      code: "PHI",
      name: "Philadelphia Eagles",
      conference: "NFC",
      division: "East",
    },
    {
      code: "PIT",
      name: "Pittsburgh Steelers",
      conference: "AFC",
      division: "North",
    },
    {
      code: "SEA",
      name: "Seattle Seahawks",
      conference: "NFC",
      division: "West",
    },
    {
      code: "SF",
      name: "San Francisco 49ers",
      conference: "NFC",
      division: "West",
    },
    {
      code: "TB",
      name: "Tampa Bay Buccaneers",
      conference: "NFC",
      division: "South",
    },
    {
      code: "TEN",
      name: "Tennessee Titans",
      conference: "AFC",
      division: "South",
    },
    {
      code: "WAS",
      name: "Washington Commanders",
      conference: "NFC",
      division: "East",
    },
  ];

  for (const team of teams) {
    await prisma.teams.upsert({
      where: { code: team.code },
      update: {},
      create: team,
    });
  }

  // --- Seed Weeks ---
  for (let i = 1; i <= 18; i++) {
    await prisma.weeks.upsert({
      where: { season_week_number: { season: 2025, week_number: i } },
      update: {},
      create: { season: 2025, week_number: i },
    });
  }

  console.log("✅ Teams and weeks seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
