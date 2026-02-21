import axios from "axios";

const API_BASE_URL = "https://v3.football.api-sports.io";
const DEFAULT_API_KEY = process.env.API_FOOTBALL_KEY;

// Rate limiting
const DELAY_BETWEEN_REQUESTS = 2000; // 2 segundos entre requisições
let lastRequestTime = 0;

// Store for dynamic API key
let dynamicApiKey: string | null = null;

// Check if DEMO_MODE is enabled
function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

// Set dynamic API key
export function setDynamicApiKey(key: string): void {
  dynamicApiKey = key;
  console.log(`[ApiFootballService] Dynamic API key set`);
}

// Delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Apply rate limiting
async function applyRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < DELAY_BETWEEN_REQUESTS) {
    const waitTime = DELAY_BETWEEN_REQUESTS - timeSinceLastRequest;
    console.log(`[ApiFootballService] Rate limiting: waiting ${waitTime}ms...`);
    await delay(waitTime);
  }
  
  lastRequestTime = Date.now();
}

// Get API key (dynamic or default)
function getApiKey(): string {
  const key = dynamicApiKey || DEFAULT_API_KEY;
  
  if (!key) {
    throw new Error("API_FOOTBALL_KEY is not configured. Please provide a valid API key.");
  }
  
  return key;
}

// Make API request with proper headers
async function makeRequest(endpoint: string, params: any = {}) {
  try {
    // Apply rate limiting
    await applyRateLimit();
    
    const apiKey = getApiKey();
    
    console.log(`[ApiFootballService] Requesting: ${endpoint}`);
    
    const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "x-apisports-key": apiKey
      },
      params,
      timeout: 10000
    });
    
    // Log rate limit info
    const remaining = response.headers["x-ratelimit-requests-remaining"];
    const limit = response.headers["x-ratelimit-requests-limit"];
    const current = response.headers["x-ratelimit-requests-current"];
    
    if (remaining !== undefined && limit !== undefined) {
      console.log(`[ApiFootballService] Rate limit: ${current || 0}/${limit} used, ${remaining} remaining`);
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error(`[ApiFootballService] Rate limit exceeded (429). Remaining: ${error.response.headers["x-ratelimit-requests-remaining"]}`);
      throw new Error("API rate limit exceeded. Please try again later or use a different API key.");
    } else if (error.response?.status === 401) {
      console.error(`[ApiFootballService] Unauthorized (401). Check API key.`);
      throw new Error("Invalid API key. Please check your credentials.");
    } else if (error.response?.status === 404) {
      console.error(`[ApiFootballService] Not found (404): ${endpoint}`);
      throw new Error(`Resource not found: ${endpoint}`);
    } else {
      console.error(`[ApiFootballService] Error: ${error.message}`);
      throw error;
    }
  }
}

// ============================================================================
// API Endpoints
// ============================================================================

export interface FootballGame {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    timezone: string;
    week: number;
    status: {
      long: string;
      short: string;
      elapsed: number;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
    };
    away: {
      id: number;
      name: string;
      logo: string;
    };
  };
  goals: {
    home: number;
    away: number;
  };
  score: {
    halftime: {
      home: number;
      away: number;
    };
    fulltime: {
      home: number;
      away: number;
    };
    extratime: {
      home: number;
      away: number;
    };
    penalty: {
      home: number;
      away: number;
    };
  };
}

// Interface para bookmaker/casa de apostas
export interface Bookmaker {
  id: number;
  name: string;
  bets: {
    id: number;
    name: string;
    values: {
      value: string;
      odd: string;
    }[];
  }[];
}

// Interface para odds detalhadas
export interface OddsResponse {
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  bookmakers: Bookmaker[];
}

/**
 * Get API status
 */
export async function getStatus() {
  try {
    const data = await makeRequest("/status");
    return data;
  } catch (error: any) {
    console.error("[ApiFootballService] Error getting status:", error.message);
    return null;
  }
}

/**
 * Fetch all fixtures for today
 */
export async function fetchAllFixturesToday(): Promise<FootballGame[]> {
  try {
    const today = new Date().toISOString().split("T")[0];
    console.log(`[ApiFootballService] Fetching fixtures for ${today}...`);
    
    const data = await makeRequest("/fixtures", {
      date: today,
      timezone: "America/Sao_Paulo"
    });
    
    if (!data.response || !Array.isArray(data.response)) {
      console.warn("[ApiFootballService] No fixtures found");
      return [];
    }
    
    console.log(`[ApiFootballService] Found ${data.response.length} fixtures`);
    return data.response;
  } catch (error: any) {
    console.error("[ApiFootballService] Error fetching fixtures:", error.message);
    return [];
  }
}

/**
 * Fetch standings for a league
 */
export async function fetchStandings(leagueId: number, season: number) {
  try {
    const data = await makeRequest("/standings", {
      league: leagueId,
      season: season
    });
    
    if (!data.response || !Array.isArray(data.response) || data.response.length === 0) {
      return null;
    }
    
    return data.response[0];
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching standings for league ${leagueId}:`, error.message);
    return null;
  }
}

/**
 * Fetch H2H (head to head) between two teams
 */
export async function fetchH2H(homeTeamId: number, awayTeamId: number) {
  try {
    const data = await makeRequest("/fixtures/headtohead", {
      h2h: `${homeTeamId}-${awayTeamId}`,
      last: 10
    });
    
    if (!data.response || !Array.isArray(data.response)) {
      return [];
    }
    
    return data.response.map((match: any) => ({
      ...match,
      homeWin: match.goals.home > match.goals.away && match.teams.home.id === homeTeamId
    }));
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching H2H:`, error.message);
    return [];
  }
}

/**
 * Fetch odds for a fixture (basic)
 */
export async function fetchOdds(fixtureId: number) {
  try {
    const data = await makeRequest("/odds", {
      fixture: fixtureId,
      bet: 1 // 1x2 odds
    });
    
    if (!data.response || !Array.isArray(data.response)) {
      return [];
    }
    
    return data.response;
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching odds for fixture ${fixtureId}:`, error.message);
    return [];
  }
}

/**
 * Fetch detailed odds with all bookmakers for a fixture
 */
export async function fetchDetailedOdds(fixtureId: number): Promise<OddsResponse | null> {
  try {
    const data = await makeRequest("/odds", {
      fixture: fixtureId
    });
    
    if (!data.response || !Array.isArray(data.response) || data.response.length === 0) {
      return null;
    }
    
    return data.response[0];
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching detailed odds for fixture ${fixtureId}:`, error.message);
    return null;
  }
}

/**
 * Fetch odds for a whole date (1X2) in a single call when the API supports it.
 * This dramatically reduces API usage versus calling /odds per fixture.
 */
export async function fetchOddsByDate(dateStr: string, timeZone: string = "America/Sao_Paulo"): Promise<Map<number, OddsResponse>> {
  const map = new Map<number, OddsResponse>();
  try {
    const data = await makeRequest("/odds", {
      date: dateStr,
      bet: 1,
      timezone: timeZone,
    });

    if (!data.response || !Array.isArray(data.response)) {
      return map;
    }

    for (const item of data.response) {
      const id = Number(item?.fixture?.id);
      if (!Number.isFinite(id)) continue;
      // Keep the first entry we see for each fixture.
      if (!map.has(id)) map.set(id, item);
    }
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching odds by date ${dateStr}:`, error.message);
  }
  return map;
}

/**
 * Extract bookmakers from odds response
 */
export function extractBookmakers(oddsResponse: OddsResponse | null): string[] {
  if (!oddsResponse || !oddsResponse.bookmakers) {
    return [];
  }
  
  return oddsResponse.bookmakers.map(b => b.name);
}

/**
 * Extract best odds from bookmakers
 */
export function extractBestOdds(oddsResponse: OddsResponse | null): {
  homeOdd: number;
  drawOdd: number;
  awayOdd: number;
  bestBookmaker: string;
} | null {
  if (!oddsResponse || !oddsResponse.bookmakers || oddsResponse.bookmakers.length === 0) {
    return null;
  }
  
  let bestHomeOdd = 0;
  let bestDrawOdd = 0;
  let bestAwayOdd = 0;
  let bestBookmaker = "";
  
  for (const bookmaker of oddsResponse.bookmakers) {
    const matchWinnerBet = bookmaker.bets.find(b => b.id === 1); // Match Winner bet
    if (!matchWinnerBet) continue;
    
    for (const value of matchWinnerBet.values) {
      const odd = parseFloat(value.odd);
      if (value.value === "Home" && odd > bestHomeOdd) {
        bestHomeOdd = odd;
        bestBookmaker = bookmaker.name;
      } else if (value.value === "Draw" && odd > bestDrawOdd) {
        bestDrawOdd = odd;
      } else if (value.value === "Away" && odd > bestAwayOdd) {
        bestAwayOdd = odd;
      }
    }
  }
  
  if (bestHomeOdd === 0 && bestDrawOdd === 0 && bestAwayOdd === 0) {
    return null;
  }
  
  return {
    homeOdd: bestHomeOdd,
    drawOdd: bestDrawOdd,
    awayOdd: bestAwayOdd,
    bestBookmaker
  };
}

/**
 * Extract consensus (average) 1X2 odds across bookmakers.
 *
 * Why: `extractBestOdds` price-shops each outcome independently (Home/Draw/Away)
 * and may combine different bookmakers into one triple, which makes implied
 * probability calculations misleading. For ranking/"confidence", we prefer a
 * market-consensus line.
 */
export function extractConsensusOdds(oddsResponse: OddsResponse | null): {
  homeOdd: number;
  drawOdd: number;
  awayOdd: number;
  samples: number;
} | null {
  if (!oddsResponse || !Array.isArray(oddsResponse.bookmakers) || oddsResponse.bookmakers.length === 0) {
    return null;
  }

  let homeSum = 0;
  let drawSum = 0;
  let awaySum = 0;
  let n = 0;

  for (const bookmaker of oddsResponse.bookmakers) {
    const matchWinnerBet = bookmaker.bets?.find(b => b.id === 1);
    if (!matchWinnerBet || !Array.isArray(matchWinnerBet.values)) continue;

    const getOdd = (label: "Home" | "Draw" | "Away") => {
      const v = matchWinnerBet.values.find(x => x.value === label);
      const odd = v ? Number.parseFloat(String(v.odd)) : 0;
      return Number.isFinite(odd) ? odd : 0;
    };

    const h = getOdd("Home");
    const d = getOdd("Draw");
    const a = getOdd("Away");
    // Only accept complete triples for fair averaging
    if (h > 1.01 && d > 1.01 && a > 1.01) {
      homeSum += h;
      drawSum += d;
      awaySum += a;
      n++;
    }
  }

  if (n === 0) return null;

  return {
    homeOdd: homeSum / n,
    drawOdd: drawSum / n,
    awayOdd: awaySum / n,
    samples: n,
  };
}

/**
 * Fetch predictions for a fixture
 */
export async function fetchPredictions(fixtureId: number) {
  try {
    const data = await makeRequest("/predictions", {
      fixture: fixtureId
    });
    
    if (!data.response || !Array.isArray(data.response) || data.response.length === 0) {
      return null;
    }
    
    return data.response[0];
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching predictions:`, error.message);
    return null;
  }
}

/**
 * Fetch injuries for a team
 */
export async function fetchInjuries(teamId: number, season: number) {
  try {
    const data = await makeRequest("/injuries", {
      team: teamId,
      season: season
    });
    
    if (!data.response || !Array.isArray(data.response)) {
      return [];
    }
    
    return data.response;
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching injuries:`, error.message);
    return [];
  }
}

/**
 * Fetch team statistics
 */
export async function fetchTeamStats(teamId: number, leagueId: number, season: number) {
  try {
    const data = await makeRequest("/teams/statistics", {
      team: teamId,
      league: leagueId,
      season: season
    });
    
    if (!data.response) {
      return null;
    }
    
    return data.response;
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching team stats:`, error.message);
    return null;
  }
}

/**
 * Fetch fixtures for a specific league
 */
export async function fetchLeagueFixtures(leagueId: number, season: number, days: number = 7) {
  try {
    const today = new Date();
    const fixtures: FootballGame[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      
      const data = await makeRequest("/fixtures", {
        league: leagueId,
        season: season,
        date: dateStr,
        timezone: "America/Sao_Paulo"
      });
      
      if (data.response && Array.isArray(data.response)) {
        fixtures.push(...data.response);
      }
    }
    
    return fixtures;
  } catch (error: any) {
    console.error(`[ApiFootballService] Error fetching league fixtures:`, error.message);
    return [];
  }
}

/**
 * Fetch all fixtures for a specific date
 */
export async function fetchFixturesByDate(dateType: 'today' | 'tomorrow' = 'today'): Promise<FootballGame[]> {
  try {
    const date = new Date();
    if (dateType === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    }
    const dateStr = date.toISOString().split("T")[0];
    console.log(`[ApiFootballService] Fetching fixtures for ${dateStr} (${dateType})...`);
    
    const data = await makeRequest("/fixtures", {
      date: dateStr,
      timezone: "America/Sao_Paulo"
    });
    
    if (!data.response || !Array.isArray(data.response)) {
      console.warn("[ApiFootballService] No fixtures found");
      return [];
    }
    
    console.log(`[ApiFootballService] Found ${data.response.length} fixtures`);
    return data.response;
  } catch (error: any) {
    console.error("[ApiFootballService] Error fetching fixtures:", error.message);
    return [];
  }
}

/**
 * Get list of available bookmakers
 */
export async function fetchAvailableBookmakers(): Promise<{ id: number; name: string }[]> {
  try {
    const data = await makeRequest("/odds/bookmakers");
    
    if (!data.response || !Array.isArray(data.response)) {
      return [];
    }
    
    return data.response;
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching bookmakers:`, error.message);
    return [];
  }
}


/**
 * Fetch fixture result by ID
 * Returns the final score of a match
 */
export async function fetchFixtureResult(fixtureId: number): Promise<{
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  statusShort: string;
  elapsed: number | null;
  finished: boolean;
} | null> {
  try {
    const data = await makeRequest("/fixtures", {
      id: fixtureId
    });
    
    if (!data.response || !Array.isArray(data.response) || data.response.length === 0) {
      return null;
    }
    
    const fixture = data.response[0];
    const status = fixture.fixture?.status;
    const goals = fixture.goals;
    
    // Status codes: NS (Not Started), 1H, HT, 2H, FT (Full Time), AET, PEN, etc.
    const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
    const isFinished = finishedStatuses.includes(status?.short || '');
    
    return {
      homeScore: goals?.home ?? null,
      awayScore: goals?.away ?? null,
      status: status?.long || 'Unknown',
      statusShort: status?.short || 'NS',
      elapsed: status?.elapsed || null,
      finished: isFinished
    };
  } catch (error: any) {
    console.warn(`[ApiFootballService] Error fetching fixture result ${fixtureId}:`, error.message);
    return null;
  }
}

/**
 * Fetch only upcoming/future fixtures for a date
 * Filters out matches that have already started or finished
 */
export async function fetchUpcomingFixtures(dateType: 'today' | 'tomorrow' = 'today'): Promise<FootballGame[]> {
  try {
    const TZ = "America/Sao_Paulo";

    const formatDateInTZ = (d: Date, timeZone: string) => {
      // en-CA yields YYYY-MM-DD
      return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    };

    const date = new Date();
    if (dateType === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    }
    // IMPORTANT: build the date string in the same timezone used by the API request.
    // Using toISOString() (UTC) can shift the day and cause the bot to fetch the wrong date.
    const dateStr = formatDateInTZ(date, TZ);
    console.log(`[ApiFootballService] Fetching UPCOMING fixtures for ${dateStr} (${dateType})...`);
    
    const data = await makeRequest("/fixtures", {
      date: dateStr,
      timezone: TZ
    });
    
    if (!data.response || !Array.isArray(data.response)) {
      console.warn("[ApiFootballService] No fixtures found");
      return [];
    }
    
    // Filter only fixtures that haven't started yet (status = NS - Not Started)
    const now = new Date();
    const upcomingFixtures = data.response.filter((fixture: FootballGame) => {
      const fixtureTime = new Date(fixture.fixture.date);
      const status = fixture.fixture.status?.short;
      
      // Only include fixtures that:
      // 1. Haven't started yet (NS status)
      // 2. OR are scheduled for the future
      return status === 'NS' || fixtureTime > now;
    });
    
    console.log(`[ApiFootballService] Found ${upcomingFixtures.length} UPCOMING fixtures (filtered from ${data.response.length} total)`);
    return upcomingFixtures;
  } catch (error: any) {
    console.error("[ApiFootballService] Error fetching upcoming fixtures:", error.message);
    return [];
  }
}

/**
 * Fetch multiple fixture results at once
 */
export async function fetchMultipleResults(fixtureIds: number[]): Promise<Map<number, {
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  finished: boolean;
}>> {
  const results = new Map();
  
  for (const id of fixtureIds) {
    try {
      const result = await fetchFixtureResult(id);
      if (result) {
        results.set(id, result);
      }
    } catch (error) {
      console.warn(`[ApiFootballService] Could not fetch result for fixture ${id}`);
    }
  }
  
  return results;
}
