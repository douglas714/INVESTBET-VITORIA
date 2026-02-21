import axios from "axios";

const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

// Get API key dynamically to ensure it's read from .env after initialization
function getApiKey(): string {
  const key = process.env.THE_ODDS_API_KEY;
  if (!key) {
    console.error("[OddsService] THE_ODDS_API_KEY is not configured in .env file");
    throw new Error("THE_ODDS_API_KEY is not configured. Please add it to your .env file.");
  }
  return key;
}

// MODO DEMO - Dados simulados para teste
const DEMO_MODE = process.env.DEMO_MODE === "true" || process.env.NODE_ENV === "development";

export interface OddsGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

export interface HeadToHeadGame {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  scores?: Array<{
    name: string;
    score: string;
  }>;
  completed: boolean;
}

// Dados de demo para teste
const DEMO_GAMES: OddsGame[] = [
  {
    id: "demo1",
    sport_key: "soccer_brazil_campeonato",
    sport_title: "Campeonato Brasileiro",
    commence_time: new Date(Date.now() + 86400000).toISOString(),
    home_team: "Flamengo",
    away_team: "Vasco",
    bookmakers: [{
      key: "bet365",
      title: "Bet365",
      markets: [{
        key: "h2h",
        outcomes: [
          { name: "Flamengo", price: 1.80 },
          { name: "Draw", price: 3.50 },
          { name: "Vasco", price: 4.20 }
        ]
      }]
    }]
  },
  {
    id: "demo2",
    sport_key: "soccer_brazil_campeonato",
    sport_title: "Campeonato Brasileiro",
    commence_time: new Date(Date.now() + 86400000).toISOString(),
    home_team: "Botafogo",
    away_team: "Santos",
    bookmakers: [{
      key: "bet365",
      title: "Bet365",
      markets: [{
        key: "h2h",
        outcomes: [
          { name: "Botafogo", price: 1.95 },
          { name: "Draw", price: 3.20 },
          { name: "Santos", price: 3.80 }
        ]
      }]
    }]
  },
  {
    id: "demo3",
    sport_key: "soccer_brazil_serie_b",
    sport_title: "Serie B",
    commence_time: new Date(Date.now() + 86400000).toISOString(),
    home_team: "Cruzeiro",
    away_team: "Atletico Mineiro",
    bookmakers: [{
      key: "bet365",
      title: "Bet365",
      markets: [{
        key: "h2h",
        outcomes: [
          { name: "Cruzeiro", price: 1.75 },
          { name: "Draw", price: 3.60 },
          { name: "Atletico Mineiro", price: 4.50 }
        ]
      }]
    }]
  },
  {
    id: "demo4",
    sport_key: "soccer_brazil_campeonato",
    sport_title: "Campeonato Brasileiro",
    commence_time: new Date(Date.now() + 86400000).toISOString(),
    home_team: "Palmeiras",
    away_team: "Corinthians",
    bookmakers: [{
      key: "bet365",
      title: "Bet365",
      markets: [{
        key: "h2h",
        outcomes: [
          { name: "Palmeiras", price: 1.85 },
          { name: "Draw", price: 3.40 },
          { name: "Corinthians", price: 4.10 }
        ]
      }]
    }]
  },
  {
    id: "demo5",
    sport_key: "soccer_brazil_campeonato",
    sport_title: "Campeonato Brasileiro",
    commence_time: new Date(Date.now() + 86400000).toISOString(),
    home_team: "Sao Paulo",
    away_team: "Benfica",
    bookmakers: [{
      key: "bet365",
      title: "Bet365",
      markets: [{
        key: "h2h",
        outcomes: [
          { name: "Sao Paulo", price: 1.90 },
          { name: "Draw", price: 3.30 },
          { name: "Benfica", price: 3.95 }
        ]
      }]
    }]
  },
  {
    id: "demo6",
    sport_key: "soccer_brazil_campeonato",
    sport_title: "Campeonato Brasileiro",
    commence_time: new Date(Date.now() + 86400000).toISOString(),
    home_team: "Gremio",
    away_team: "Internacional",
    bookmakers: [{
      key: "bet365",
      title: "Bet365",
      markets: [{
        key: "h2h",
        outcomes: [
          { name: "Gremio", price: 1.88 },
          { name: "Draw", price: 3.45 },
          { name: "Internacional", price: 4.05 }
        ]
      }]
    }]
  }
];

/**
 * Fetch all available sports from The Odds API
 */
export async function fetchSports() {
  if (DEMO_MODE) {
    console.log("[OddsService] MODO DEMO ATIVADO - Retornando esportes de teste");
    return [
      { key: "soccer_brazil_campeonato", title: "Campeonato Brasileiro", group: "Soccer" },
      { key: "soccer_brazil_serie_b", title: "Serie B", group: "Soccer" }
    ];
  }

  try {
    const apiKey = getApiKey();
    const response = await axios.get(`${THE_ODDS_API_BASE_URL}/sports`, {
      params: { apiKey }
    });
    return response.data;
  } catch (error) {
    console.error("[OddsService] Failed to fetch sports:", error);
    throw error;
  }
}

/**
 * Fetch odds for a specific sport
 */
export async function fetchOdds(sportKey: string, markets: string = "h2h") {
  if (DEMO_MODE) {
    console.log(`[OddsService] MODO DEMO - Retornando dados de teste para ${sportKey}`);
    return DEMO_GAMES.filter(g => g.sport_key === sportKey || sportKey === "all");
  }

  try {
    const apiKey = getApiKey();
    const response = await axios.get(`${THE_ODDS_API_BASE_URL}/sports/${sportKey}/odds`, {
      params: {
        apiKey,
        markets,
        oddsFormat: "decimal",
        dateFormat: "iso"
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429 || error.response?.data?.error_code === "EXCEEDED_FREQ_LIMIT") {
      const message = `[OddsService] API LIMIT REACHED for ${sportKey}. The Odds API free plan has a limit of 500 requests/month. Please upgrade your plan or try again later.\nResponse: ${JSON.stringify(error.response?.data || {})}`;
      console.error(message);
      throw new Error(message);
    }
    console.error(`[OddsService] Failed to fetch ${sportKey}:`, error.message);
    throw error;
  }
}

/**
 * Fetch all games for today
 */
export async function fetchAllGames() {
  if (DEMO_MODE) {
    console.log("[OddsService] MODO DEMO - Retornando todos os jogos de teste");
    return DEMO_GAMES;
  }

  const sports = [
    "soccer_brazil_campeonato",
    "soccer_brazil_serie_b",
    "soccer_brazil_serie_c",
    "soccer_argentina_primera_division",
    "soccer_chile_primera_division",
    "soccer_colombia_primera_a",
    "soccer_mexico_primera_division",
    "soccer_usa_mls",
    "soccer_england_premier_league",
    "soccer_england_championship",
    "soccer_france_ligue_one",
    "soccer_france_ligue_two",
    "soccer_germany_bundesliga",
    "soccer_germany_2bundesliga",
    "soccer_italy_serie_a",
    "soccer_italy_serie_b",
    "soccer_spain_la_liga",
    "soccer_spain_segunda_division"
  ];

  console.log("[OddsService] Fetching games from 17 leagues...");

  const allGames: OddsGame[] = [];
  const errors: string[] = [];

  for (const sport of sports) {
    try {
      const games = await fetchOdds(sport);
      if (Array.isArray(games)) {
        allGames.push(...games);
      }
    } catch (error: any) {
      errors.push(error.message || String(error));
    }
  }

  const totalGames = allGames.length;
  const todayGames = allGames.filter(game => {
    const gameDate = new Date(game.commence_time);
    const today = new Date();
    return gameDate.toDateString() === today.toDateString();
  });

  console.log(`[OddsService] Found ${totalGames} total games`);
  console.log(`[OddsService] Found ${todayGames.length} games for today`);

  return todayGames;
}

/**
 * Fetch head to head history between two teams
 */
export async function fetchHeadToHead(homeTeam: string, awayTeam: string): Promise<HeadToHeadGame[]> {
  if (DEMO_MODE) {
    console.log(`[OddsService] MODO DEMO - Retornando histórico de teste para ${homeTeam} vs ${awayTeam}`);
    return [
      {
        id: "h2h1",
        commence_time: new Date(Date.now() - 86400000 * 30).toISOString(),
        home_team: homeTeam,
        away_team: awayTeam,
        completed: true,
        scores: [
          { name: homeTeam, score: "2" },
          { name: awayTeam, score: "1" }
        ]
      },
      {
        id: "h2h2",
        commence_time: new Date(Date.now() - 86400000 * 60).toISOString(),
        home_team: homeTeam,
        away_team: awayTeam,
        completed: true,
        scores: [
          { name: homeTeam, score: "1" },
          { name: awayTeam, score: "0" }
        ]
      }
    ];
  }

  // In a real implementation, this would fetch from an API
  // For now, we'll return an empty array
  return [];
}
