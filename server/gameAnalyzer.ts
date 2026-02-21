import { OddsGame, HeadToHeadGame } from "./oddsService";

export interface AnalyzedGame {
  gameId: string;
  sportKey: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  homeOdd: number;
  drawOdd: number;
  awayOdd: number;
  oddDifference: number; // Difference between away and home odds
  approved: boolean;
  rejectionReasons: string[];
}

export interface AnalysisResult {
  approved: AnalyzedGame[];
  rejected: AnalyzedGame[];
  logs: string[];
}

/**
 * Extract odds from bookmakers data
 * Returns the average odds across all bookmakers for h2h market
 */
function extractOdds(game: OddsGame): {
  homeOdd: number;
  drawOdd: number;
  awayOdd: number;
} | null {
  const h2hMarkets = game.bookmakers
    .flatMap((bookmaker) => bookmaker.markets)
    .filter((market) => market.key === "h2h");

  if (h2hMarkets.length === 0) {
    return null;
  }

  let homeOdds: number[] = [];
  let drawOdds: number[] = [];
  let awayOdds: number[] = [];

  h2hMarkets.forEach((market) => {
    market.outcomes.forEach((outcome) => {
      if (outcome.name === game.home_team) {
        homeOdds.push(outcome.price);
      } else if (outcome.name === game.away_team) {
        awayOdds.push(outcome.price);
      } else {
        // Draw
        drawOdds.push(outcome.price);
      }
    });
  });

  if (homeOdds.length === 0 || awayOdds.length === 0) {
    return null;
  }

  // Calculate average odds
  const avgHome = homeOdds.reduce((a, b) => a + b, 0) / homeOdds.length;
  const avgAway = awayOdds.reduce((a, b) => a + b, 0) / awayOdds.length;
  const avgDraw =
    drawOdds.length > 0
      ? drawOdds.reduce((a, b) => a + b, 0) / drawOdds.length
      : 0;

  return {
    homeOdd: Number(avgHome.toFixed(2)),
    drawOdd: Number(avgDraw.toFixed(2)),
    awayOdd: Number(avgAway.toFixed(2)),
  };
}

/**
 * Check if odds are in correct order: home < draw < away
 */
function checkOddsOrder(
  homeOdd: number,
  drawOdd: number,
  awayOdd: number
): boolean {
  return homeOdd < drawOdd && drawOdd < awayOdd;
}

/**
 * Check if home team is favorite (has lowest odd)
 */
function checkHomeFavorite(
  homeOdd: number,
  drawOdd: number,
  awayOdd: number
): boolean {
  return homeOdd < drawOdd && homeOdd < awayOdd;
}

/**
 * Analyze head-to-head history
 * Returns true if home team won ALL previous matches by 2+ goals
 */
function analyzeHeadToHead(h2hGames: HeadToHeadGame[], homeTeam: string): {
  passed: boolean;
  reason?: string;
} {
  if (h2hGames.length === 0) {
    // If no H2H data available, we'll accept the game
    // In production, you might want to reject games without H2H data
    return { passed: true };
  }

  for (const game of h2hGames) {
    if (!game.completed || !game.scores) {
      continue;
    }

    const homeScore = game.scores.find((s) => s.name === homeTeam);
    const awayScore = game.scores.find((s) => s.name !== homeTeam);

    if (!homeScore || !awayScore) {
      continue;
    }

    const homeGoals = parseInt(homeScore.score);
    const awayGoals = parseInt(awayScore.score);

    // Check if home team won
    if (homeGoals <= awayGoals) {
      return {
        passed: false,
        reason: `H2H: Found draw or loss (${homeGoals}-${awayGoals})`,
      };
    }

    // Check if won by 2+ goals
    const goalDifference = homeGoals - awayGoals;
    if (goalDifference < 2) {
      return {
        passed: false,
        reason: `H2H: Victory margin less than 2 goals (${homeGoals}-${awayGoals})`,
      };
    }
  }

  return { passed: true };
}

/**
 * Analyze a single game against all criteria
 */
export function analyzeGame(
  game: OddsGame,
  h2hGames: HeadToHeadGame[] = []
): AnalyzedGame {
  const rejectionReasons: string[] = [];
  let approved = true;

  // Extract odds
  const odds = extractOdds(game);
  if (!odds) {
    rejectionReasons.push("No valid odds data available");
    approved = false;
  }

  const homeOdd = odds?.homeOdd || 0;
  const drawOdd = odds?.drawOdd || 0;
  const awayOdd = odds?.awayOdd || 0;
  const oddDifference = awayOdd - homeOdd;

  // Criterion 1: Home team must be favorite
  if (odds && !checkHomeFavorite(homeOdd, drawOdd, awayOdd)) {
    rejectionReasons.push(
      `Home team not favorite (Home: ${homeOdd}, Draw: ${drawOdd}, Away: ${awayOdd})`
    );
    approved = false;
  }

  // Criterion 2: Odds must be in order (home < draw < away)
  if (odds && !checkOddsOrder(homeOdd, drawOdd, awayOdd)) {
    rejectionReasons.push(
      `Odds not in correct order (Home: ${homeOdd}, Draw: ${drawOdd}, Away: ${awayOdd})`
    );
    approved = false;
  }

  // Criterion 3: Head-to-head analysis
  const h2hResult = analyzeHeadToHead(h2hGames, game.home_team);
  if (!h2hResult.passed) {
    rejectionReasons.push(h2hResult.reason || "H2H criteria not met");
    approved = false;
  }

  return {
    gameId: game.id,
    sportKey: game.sport_key,
    league: game.sport_title,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    commenceTime: new Date(game.commence_time),
    homeOdd,
    drawOdd,
    awayOdd,
    oddDifference,
    approved,
    rejectionReasons,
  };
}

/**
 * Analyze multiple games and return top 6 approved games
 */
export function analyzeGames(
  games: OddsGame[],
  h2hData: Map<string, HeadToHeadGame[]> = new Map()
): AnalysisResult {
  const logs: string[] = [];
  const approved: AnalyzedGame[] = [];
  const rejected: AnalyzedGame[] = [];

  logs.push(`[GameAnalyzer] Starting analysis of ${games.length} games`);

  // Analyze each game
  games.forEach((game) => {
    const h2hGames = h2hData.get(game.id) || [];
    const analysis = analyzeGame(game, h2hGames);

    if (analysis.approved) {
      approved.push(analysis);
      logs.push(
        `[GameAnalyzer] ✓ APPROVED: ${analysis.homeTeam} vs ${analysis.awayTeam} (Odd: ${analysis.homeOdd}, Diff: ${analysis.oddDifference.toFixed(2)})`
      );
    } else {
      rejected.push(analysis);
      logs.push(
        `[GameAnalyzer] ✗ REJECTED: ${analysis.homeTeam} vs ${analysis.awayTeam}`
      );
      analysis.rejectionReasons.forEach((reason) => {
        logs.push(`  └─ ${reason}`);
      });
    }
  });

  // Sort approved games by priority:
  // 1. Lower home odd (stronger favorite)
  // 2. Higher odd difference (bigger gap between home and away)
  approved.sort((a, b) => {
    if (a.homeOdd !== b.homeOdd) {
      return a.homeOdd - b.homeOdd; // Lower odd first
    }
    return b.oddDifference - a.oddDifference; // Higher difference first
  });

  // Select top 6 games
  const selectedGames = approved.slice(0, 6);
  const notSelected = approved.slice(6);

  logs.push(`[GameAnalyzer] Total analyzed: ${games.length}`);
  logs.push(`[GameAnalyzer] Approved: ${approved.length}`);
  logs.push(`[GameAnalyzer] Rejected: ${rejected.length}`);
  logs.push(`[GameAnalyzer] Selected for display: ${selectedGames.length}`);

  if (notSelected.length > 0) {
    logs.push(
      `[GameAnalyzer] ${notSelected.length} approved games not selected (limit: 6)`
    );
  }

  return {
    approved: selectedGames,
    rejected: [...rejected, ...notSelected],
    logs,
  };
}
