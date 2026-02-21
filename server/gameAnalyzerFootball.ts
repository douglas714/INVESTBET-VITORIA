import {
  fetchStandings,
  fetchH2H,
  fetchPredictions,
  fetchInjuries,
  FootballGame,
  TeamStanding,
  H2HMatch
} from "./apiFootballService";

export interface GameAnalysis {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  score: number;
  approved: boolean;
  criteria: {
    homeOddLow: boolean;
    awayOddHigh: boolean;
    h2hPositive: boolean;
    homeRanking: boolean;
    awayRanking: boolean;
    noMajorInjuries: boolean;
  };
  details: {
    homeOdd: number;
    awayOdd: number;
    h2hWins: number;
    h2hTotal: number;
    homeRank: number;
    awayRank: number;
    injuries: number;
  };
}

/**
 * Analyze a single game
 */
export async function analyzeGame(game: FootballGame): Promise<GameAnalysis> {
  const analysis: GameAnalysis = {
    fixtureId: game.fixture.id,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name,
    league: game.league.name,
    date: game.fixture.date,
    score: 0,
    approved: false,
    criteria: {
      homeOddLow: false,
      awayOddHigh: false,
      h2hPositive: false,
      homeRanking: false,
      awayRanking: false,
      noMajorInjuries: false
    },
    details: {
      homeOdd: game.odds.home,
      awayOdd: game.odds.away,
      h2hWins: 0,
      h2hTotal: 0,
      homeRank: 0,
      awayRank: 0,
      injuries: 0
    }
  };

  try {
    // Criterion 1: Home team odds < 2.0 (favorite)
    if (game.odds.home < 2.0) {
      analysis.criteria.homeOddLow = true;
      analysis.score += 20;
    }

    // Criterion 2: Away team odds > 3.0 (underdog)
    if (game.odds.away > 3.0) {
      analysis.criteria.awayOddHigh = true;
      analysis.score += 20;
    }

    // Criterion 3: Fetch standings for ranking
    const standings = await fetchStandings(game.league.id, game.league.season);
    
    if (standings.length > 0) {
      const homeStanding = standings.find(s => s.team.id === game.teams.home.id);
      const awayStanding = standings.find(s => s.team.id === game.teams.away.id);

      if (homeStanding) {
        analysis.details.homeRank = homeStanding.rank;
        // Home team in top 8
        if (homeStanding.rank <= 8) {
          analysis.criteria.homeRanking = true;
          analysis.score += 15;
        }
      }

      if (awayStanding) {
        analysis.details.awayRank = awayStanding.rank;
        // Away team not in bottom 4
        if (awayStanding.rank > 16) {
          analysis.criteria.awayRanking = true;
          analysis.score += 10;
        }
      }
    }

    // Criterion 4: Fetch H2H history
    const h2h = await fetchH2H(game.teams.home.id, game.teams.away.id);
    
    if (h2h.length > 0) {
      analysis.details.h2hTotal = h2h.length;
      const homeWins = h2h.filter(m => m.homeWin).length;
      analysis.details.h2hWins = homeWins;

      // Home team won at least 50% of H2H
      if (homeWins >= h2h.length / 2) {
        analysis.criteria.h2hPositive = true;
        analysis.score += 20;
      }
    }

    // Criterion 5: Check injuries
    const injuries = await fetchInjuries(game.teams.home.id, game.league.season);
    analysis.details.injuries = injuries.length;

    // No major injuries (less than 3 key players out)
    if (injuries.length < 3) {
      analysis.criteria.noMajorInjuries = true;
      analysis.score += 15;
    }

    // Criterion 6: Fetch predictions
    const predictions = await fetchPredictions(game.fixture.id);
    
    if (predictions && predictions.predictions) {
      const predictionWinner = predictions.predictions.winner;
      // Prediction favors home team
      if (predictionWinner === "home") {
        analysis.score += 10;
      }
    }

    // Determine if approved (at least 3 criteria met and score > 50)
    const criteriaCount = Object.values(analysis.criteria).filter(v => v).length;
    analysis.approved = criteriaCount >= 3 && analysis.score >= 50;

  } catch (error: any) {
    console.error(`[GameAnalyzer] Error analyzing game ${game.fixture.id}:`, error.message);
  }

  return analysis;
}

/**
 * Analyze multiple games and return top 6
 */
export async function analyzeGames(games: FootballGame[]): Promise<GameAnalysis[]> {
  console.log(`[GameAnalyzer] Analyzing ${games.length} games...`);

  const analyses: GameAnalysis[] = [];

  for (const game of games) {
    try {
      const analysis = await analyzeGame(game);
      analyses.push(analysis);

      if (analysis.approved) {
        console.log(
          `[GameAnalyzer] ✓ APPROVED: ${analysis.homeTeam} vs ${analysis.awayTeam} (Score: ${analysis.score}/100)`
        );
      } else {
        console.log(
          `[GameAnalyzer] ✗ REJECTED: ${analysis.homeTeam} vs ${analysis.awayTeam} (Score: ${analysis.score}/100)`
        );
      }
    } catch (error: any) {
      console.error(`[GameAnalyzer] Error analyzing game:`, error.message);
    }
  }

  // Filter approved games and sort by score
  const approved = analyses
    .filter(a => a.approved)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  console.log(`[GameAnalyzer] Total analyzed: ${analyses.length}`);
  console.log(`[GameAnalyzer] Approved: ${approved.length}`);
  console.log(`[GameAnalyzer] Rejected: ${analyses.length - approved.length}`);

  return approved;
}

/**
 * Get detailed analysis report
 */
export function getAnalysisReport(analyses: GameAnalysis[]): string {
  let report = "=== GAME ANALYSIS REPORT ===\n\n";

  for (const analysis of analyses) {
    report += `${analysis.homeTeam} vs ${analysis.awayTeam}\n`;
    report += `League: ${analysis.league}\n`;
    report += `Date: ${analysis.date}\n`;
    report += `Score: ${analysis.score}/100\n`;
    report += `Status: ${analysis.approved ? "✓ APPROVED" : "✗ REJECTED"}\n`;
    report += `\nCriteria:\n`;
    report += `  • Home odds < 2.0: ${analysis.criteria.homeOddLow ? "✓" : "✗"} (${analysis.details.homeOdd})\n`;
    report += `  • Away odds > 3.0: ${analysis.criteria.awayOddHigh ? "✓" : "✗"} (${analysis.details.awayOdd})\n`;
    report += `  • Home ranking: ${analysis.criteria.homeRanking ? "✓" : "✗"} (Rank: ${analysis.details.homeRank})\n`;
    report += `  • Away ranking: ${analysis.criteria.awayRanking ? "✓" : "✗"} (Rank: ${analysis.details.awayRank})\n`;
    report += `  • H2H positive: ${analysis.criteria.h2hPositive ? "✓" : "✗"} (${analysis.details.h2hWins}/${analysis.details.h2hTotal})\n`;
    report += `  • No major injuries: ${analysis.criteria.noMajorInjuries ? "✓" : "✗"} (${analysis.details.injuries} out)\n`;
    report += "\n";
  }

  return report;
}
