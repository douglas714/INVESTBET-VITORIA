import {
  fetchStandings,
  fetchH2H,
  fetchOdds,
  fetchFixtures,
  FootballGame,
} from "./apiFootballService";

// IDs das principais ligas
const MAIN_LEAGUES = [71, 72, 128, 39, 140, 135, 61, 78, 94, 203];

// Limite máximo de análises por sessão
const MAX_ANALYSES = 100;

export interface GameAnalysis {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  score: number;
  approved: boolean;
  criteria: {
    homeFavorite: boolean;      // Home odd < 2.0
    oddDifference: boolean;     // Away odd - Home odd >= 2.0
    lastTwoWins: boolean;       // Últimos 2 jogos com vitória 1+ gol
    oddsAvailable: boolean;     // Odds disponíveis em casa de aposta
  };
  details: {
    homeOdd: number;
    awayOdd: number;
    oddDiff: number;
    lastGames: Array<{ result: string; goals: number }>;
    bookmakers: number;
  };
}

export interface AnalysisProgress {
  analyzed: number;
  approved: number;
  rejected: number;
  total: number;
  percentage: number;
  stopped: boolean;
  reason?: string;
}

/**
 * Verificar se é uma liga principal
 */
function isMainLeague(leagueId: number): boolean {
  return MAIN_LEAGUES.includes(leagueId);
}

/**
 * Analisar um jogo
 */
export async function analyzeGame(game: FootballGame): Promise<GameAnalysis | null> {
  // Filtrar apenas ligas principais
  if (!isMainLeague(game.league.id)) {
    return null;
  }

  const analysis: GameAnalysis = {
    fixtureId: game.fixture.id,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name,
    league: game.league.name,
    date: game.fixture.date,
    score: 0,
    approved: false,
    criteria: {
      homeFavorite: false,
      oddDifference: false,
      lastTwoWins: false,
      oddsAvailable: false,
    },
    details: {
      homeOdd: 0,
      awayOdd: 0,
      oddDiff: 0,
      lastGames: [],
      bookmakers: 0,
    },
  };

  try {
    // Criterion 1: Buscar odds - Validar se está em casa de aposta
    let hasValidOdds = false;
    try {
      const odds = await fetchOdds(game.fixture.id);
      
      if (odds && odds.length > 0) {
        // Procurar odds 1x2 (home, draw, away)
        const homeOdd = odds[0]?.values?.home || 0;
        const awayOdd = odds[0]?.values?.away || 0;

        if (homeOdd > 0 && awayOdd > 0) {
          analysis.details.homeOdd = homeOdd;
          analysis.details.awayOdd = awayOdd;
          analysis.details.oddDiff = awayOdd - homeOdd;
          analysis.details.bookmakers = odds.length;
          hasValidOdds = true;

          // Criterion 1: Home é favorito (odd < 2.0)
          if (homeOdd < 2.0) {
            analysis.criteria.homeFavorite = true;
            analysis.score += 30;
          }

          // Criterion 2: Diferença de odds >= 2.0
          if ((awayOdd - homeOdd) >= 2.0) {
            analysis.criteria.oddDifference = true;
            analysis.score += 30;
          }

          // Validar que está em casa de aposta
          analysis.criteria.oddsAvailable = true;
        }
      }
    } catch (error: any) {
      console.warn(`[GameAnalyzer] Could not fetch odds: ${error.message}`);
    }

    // Se não tem odds válidas, rejeitar
    if (!hasValidOdds) {
      return analysis; // Retorna com score 0 (rejeitado)
    }

    // Criterion 3: Últimos 2 jogos com vitória + 1 gol
    try {
      const h2h = await fetchH2H(game.teams.home.id, game.teams.away.id);

      if (h2h && h2h.length >= 2) {
        const lastTwo = h2h.slice(0, 2);
        let twoWinsWithGoals = 0;

        for (const match of lastTwo) {
          const homeGoals = match.goals?.home || 0;
          const awayGoals = match.goals?.away || 0;
          const goalDiff = homeGoals - awayGoals;

          // Verificar se foi vitória (home) com diferença >= 1 gol
          if (match.homeWin && goalDiff >= 1) {
            twoWinsWithGoals++;
            analysis.details.lastGames.push({
              result: `${homeGoals}-${awayGoals}`,
              goals: goalDiff,
            });
          }
        }

        // Precisa de 2 vitórias com 1+ gol
        if (twoWinsWithGoals === 2) {
          analysis.criteria.lastTwoWins = true;
          analysis.score += 40;
        }
      }
    } catch (error: any) {
      console.warn(`[GameAnalyzer] Could not fetch H2H: ${error.message}`);
    }

    // Determinar aprovação
    // Precisa de: odds disponíveis + home favorito + diferença 2+ + últimos 2 wins
    const allCriteriaMet =
      analysis.criteria.oddsAvailable &&
      analysis.criteria.homeFavorite &&
      analysis.criteria.oddDifference &&
      analysis.criteria.lastTwoWins;

    analysis.approved = allCriteriaMet && analysis.score >= 80;

  } catch (error: any) {
    console.error(`[GameAnalyzer] Error analyzing game ${game.fixture.id}:`, error.message);
  }

  return analysis;
}

/**
 * Analisar múltiplos jogos com limite de 100 análises
 * Retorna resultados conforme encontra (streaming)
 */
export async function analyzeGamesWithProgress(
  games: FootballGame[],
  onProgress: (progress: AnalysisProgress, approved: GameAnalysis[]) => void
): Promise<GameAnalysis[]> {
  console.log(`[GameAnalyzer] Starting analysis with MAX_ANALYSES=${MAX_ANALYSES}`);

  const approved: GameAnalysis[] = [];
  let analyzed = 0;
  let rejected = 0;

  for (const game of games) {
    // Parar se atingir limite de 100 análises
    if (analyzed >= MAX_ANALYSES) {
      console.log(`[GameAnalyzer] Reached analysis limit of ${MAX_ANALYSES}`);
      
      const progress: AnalysisProgress = {
        analyzed,
        approved: approved.length,
        rejected,
        total: games.length,
        percentage: Math.round((analyzed / games.length) * 100),
        stopped: true,
        reason: `Reached limit of ${MAX_ANALYSES} analyses`,
      };

      onProgress(progress, approved);
      break;
    }

    try {
      const analysis = await analyzeGame(game);

      if (analysis === null) {
        // Não é liga principal, pular
        continue;
      }

      analyzed++;

      if (analysis.approved) {
        approved.push(analysis);
        console.log(
          `[GameAnalyzer] ✓ APPROVED (${approved.length}/6): ${analysis.homeTeam} vs ${analysis.awayTeam} (Score: ${analysis.score}/100)`
        );
      } else {
        rejected++;
        console.log(
          `[GameAnalyzer] ✗ REJECTED: ${analysis.homeTeam} vs ${analysis.awayTeam} (Score: ${analysis.score}/100)`
        );
      }

      // Enviar progresso a cada análise
      const progress: AnalysisProgress = {
        analyzed,
        approved: approved.length,
        rejected,
        total: games.length,
        percentage: Math.round((analyzed / games.length) * 100),
        stopped: false,
      };

      onProgress(progress, approved);

      // Se já encontrou 6, pode parar
      if (approved.length >= 6) {
        console.log(`[GameAnalyzer] Found 6 approved games, stopping analysis`);
        
        const finalProgress: AnalysisProgress = {
          analyzed,
          approved: approved.length,
          rejected,
          total: games.length,
          percentage: Math.round((analyzed / games.length) * 100),
          stopped: true,
          reason: "Found 6 approved games",
        };

        onProgress(finalProgress, approved);
        break;
      }

    } catch (error: any) {
      console.error(`[GameAnalyzer] Error analyzing game:`, error.message);
      analyzed++;
    }
  }

  // Ordenar por score (melhor para pior)
  approved.sort((a, b) => b.score - a.score);

  return approved.slice(0, 6);
}

/**
 * Gerar relatório de análise
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
    report += `  • Home Favorite (< 2.0): ${analysis.criteria.homeFavorite ? "✓" : "✗"} (Odd: ${analysis.details.homeOdd})\n`;
    report += `  • Odd Difference (>= 2.0): ${analysis.criteria.oddDifference ? "✓" : "✗"} (Diff: ${analysis.details.oddDiff.toFixed(2)})\n`;
    report += `  • Last 2 Wins (1+ goal): ${analysis.criteria.lastTwoWins ? "✓" : "✗"}\n`;
    report += `  • Odds Available: ${analysis.criteria.oddsAvailable ? "✓" : "✗"} (${analysis.details.bookmakers} bookmakers)\n`;
    report += `\nDetails:\n`;
    report += `  • Home Odd: ${analysis.details.homeOdd}\n`;
    report += `  • Away Odd: ${analysis.details.awayOdd}\n`;
    report += `  • Last Games: ${analysis.details.lastGames.map(g => g.result).join(", ") || "N/A"}\n`;
    report += "\n";
  }

  return report;
}
