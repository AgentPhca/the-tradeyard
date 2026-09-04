// Team-to-division grouping for the BaseYard sticker album's division
// accordion. Team names must match NFL_TEAMS (lib/data/nflTeams.ts) and the
// `team` values stored in card_catalog exactly.
export const NFL_DIVISIONS = [
  {
    name: "AFC East",
    teams: ["Buffalo Bills", "Miami Dolphins", "New England Patriots", "New York Jets"],
  },
  {
    name: "AFC North",
    teams: ["Baltimore Ravens", "Cincinnati Bengals", "Cleveland Browns", "Pittsburgh Steelers"],
  },
  {
    name: "AFC South",
    teams: ["Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Tennessee Titans"],
  },
  {
    name: "AFC West",
    teams: ["Denver Broncos", "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers"],
  },
  {
    name: "NFC East",
    teams: ["Dallas Cowboys", "New York Giants", "Philadelphia Eagles", "Washington Commanders"],
  },
  {
    name: "NFC North",
    teams: ["Chicago Bears", "Detroit Lions", "Green Bay Packers", "Minnesota Vikings"],
  },
  {
    name: "NFC South",
    teams: ["Atlanta Falcons", "Carolina Panthers", "New Orleans Saints", "Tampa Bay Buccaneers"],
  },
  {
    name: "NFC West",
    teams: ["Arizona Cardinals", "Los Angeles Rams", "San Francisco 49ers", "Seattle Seahawks"],
  },
] as const;
