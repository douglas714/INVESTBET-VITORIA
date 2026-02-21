import {
  fetchStandings,
  fetchH2H,
  fetchOdds,
  fetchPredictions,
  FootballGame,
} from "./apiFootballService";

// IDs das principais ligas
const MAIN_LEAGUES = [71, 72, 128, 39, 140, 135, 61, 78, 94, 203];

// Limite máximo de análises por sessão
const MAX_ANALYSES = 100;

// Limite de jogos aprovados
const MAX_APPROVED = 6;

export interface GameAnalysisPro {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  
  // Score e aprovação
  strengthScore: number;  // 0-100 (força geral do jogo)
  approved: boolean;
  
  // Critérios
  criteria: {
    oddsQuality: boolean;           // Odds disponíveis e de qualidade
    recentForm: boolean;            // Forma recente positiva
    h2hFavorable: boolean;          // Histórico favorável
    statisticsStrong: boolean;      // Estatísticas fortes
    valueBetting: boolean;          // Oportunidade de value betting
  };
  
  // Scores dos critérios (0-100)
  criteriaScores: {
    oddsScore: number;              // 0-30 (qualidade das odds)
    formScore: number;              // 0-25 (forma recente)
    h2hScore: number;               // 0-20 (histórico)
    statsScore: number;             // 0-15 (estatísticas)
    motivationScore: number;        // 0-10 (motivação)
  };
  
  // Detalhes
  details: {
    homeOdd: number;
    awayOdd: number;
    oddDiff: number;
    homeWinProbability: number;     // Probabilidade calculada
    impliedProbability: number;     // Probabilidade implícita nas odds
    expectedValue: number;          // EV calculado
    lastGames: Array<{ result: string; goals: number }>;
    bookmakers: number;
    recentPoints: number;           // Pontos nos últimos 5 jogos
    h2hWins: number;                // Vitórias em últimos 3 confrontos
    xG: number;                     // Expected goals (simulado)
  };
}

export interface AnalysisProgressPro {
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
 * Calcular score de odds (0-30)
 * Favoritos com odds boas = score alto
 * Underdogs com odds altas = score baixo
 */
function calculateOddsScore(homeOdd: number, awayOdd: number): number {
  // Preferir odds entre 1.5 e 2.5 (favorito mas não excessivo)
  if (homeOdd >= 1.5 && homeOdd <= 2.5) {
    return 30;
  } else if (homeOdd >= 1.3 && homeOdd <= 3.0) {
    return 25;
  } else if (homeOdd >= 1.2 && homeOdd <= 4.0) {
    return 20;
  } else if (homeOdd >= 1.1) {
    return 15;
  }
  return 10;
}

/**
 * Calcular score de forma recente (0-25)
 * Baseado em pontos nos últimos 5 jogos
 */
function calculateFormScore(recentPoints: number): number {
  if (recentPoints >= 12) return 25;  // Excelente (4+ vitórias)
  if (recentPoints >= 8) return 20;   // Bom (2-3 vitórias)
  if (recentPoints >= 4) return 15;   // Médio (1-2 vitórias)
  if (recentPoints >= 1) return 10;   // Fraco
  return 5;
}

/**
 * Calcular score H2H (0-20)
 * Baseado em vitórias nos últimos 3 confrontos
 */
function calculateH2HScore(h2hWins: number, totalH2H: number): number {
  if (h2hWins === 3) return 20;  // 100% vitórias
  if (h2hWins === 2) return 15;  // 66%
  if (h2hWins === 1) return 10;  // 33%
  if (totalH2H > 0) return 5;    // Sem vitórias mas tem histórico
  return 8;                       // Sem dados, score neutro
}

/**
 * Calcular score estatístico (0-15)
 * Baseado em xG e defesa
 */
function calculateStatsScore(xG: number): number {
  if (xG >= 1.5) return 15;  // Ataque forte
  if (xG >= 1.3) return 12;  // Ataque bom
  if (xG >= 1.1) return 10;  // Ataque médio
  if (xG >= 0.9) return 8;   // Ataque fraco
  return 5;
}

/**
 * Calcular score de motivação (0-10)
 * Simulado baseado em contexto
 */
function calculateMotivationScore(): number {
  // Em implementação real, verificar:
  // - Posição na tabela
  // - Objetivos do time (título, rebaixamento, etc)
  // - Importância da partida
  return 5; // Score neutro por enquanto
}

/**
 * Calcular probabilidade implícita nas odds
 */
function calculateImpliedProbability(odd: number): number {
  return (1 / odd) * 100;
}

/**
 * Calcular probabilidade real baseada em dados
 * Fórmula simplificada: (xG + forma + h2h) / 3
 */
function calculateRealProbability(
  xG: number,
  formScore: number,
  h2hScore: number
): number {
  // Normalizar scores para 0-100
  const formProb = (formScore / 25) * 100;
  const h2hProb = (h2hScore / 20) * 100;
  const xGProb = Math.min(xG * 20, 100); // xG de 0-5 = 0-100%

  // Média ponderada
  return (xGProb * 0.4 + formProb * 0.35 + h2hProb * 0.25);
}

/**
 * Calcular Expected Value
 * EV = (Probabilidade Real × Lucro) - (Probabilidade Perda × Stake)
 */
function calculateEV(realProb: number, odd: number, stake: number = 100): number {
  const probWin = realProb / 100;
  const probLose = 1 - probWin;
  
  const profit = (odd - 1) * stake;
  const loss = stake;
  
  const ev = (probWin * profit) - (probLose * loss);
  return ev / stake; // Retornar como percentual
}

/**
 * Analisar um jogo com estratégia PRO
 */
export async function analyzeGamePro(game: FootballGame): Promise<GameAnalysisPro | null> {
  // Filtrar apenas ligas principais
  if (!isMainLeague(game.league.id)) {
    return null;
  }

  const analysis: GameAnalysisPro = {
    fixtureId: game.fixture.id,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name,
    league: game.league.name,
    date: game.fixture.date,
    strengthScore: 0,
    approved: false,
    criteria: {
      oddsQuality: false,
      recentForm: false,
      h2hFavorable: false,
      statisticsStrong: false,
      valueBetting: false,
    },
    criteriaScores: {
      oddsScore: 0,
      formScore: 0,
      h2hScore: 0,
      statsScore: 0,
      motivationScore: 0,
    },
    details: {
      homeOdd: 0,
      awayOdd: 0,
      oddDiff: 0,
      homeWinProbability: 0,
      impliedProbability: 0,
      expectedValue: 0,
      lastGames: [],
      bookmakers: 0,
      recentPoints: 0,
      h2hWins: 0,
      xG: 0,
    },
  };

  try {
    // ========== CRITÉRIO 1: ODDS ==========
    let hasValidOdds = false;
    try {
      const odds = await fetchOdds(game.fixture.id);
      
      if (odds && odds.length > 0) {
        const homeOdd = odds[0]?.values?.home || 0;
        const awayOdd = odds[0]?.values?.away || 0;

        if (homeOdd > 0 && awayOdd > 0) {
          analysis.details.homeOdd = homeOdd;
          analysis.details.awayOdd = awayOdd;
          analysis.details.oddDiff = awayOdd - homeOdd;
          analysis.details.bookmakers = odds.length;
          analysis.details.impliedProbability = calculateImpliedProbability(homeOdd);
          
          hasValidOdds = true;
          
          // Calcular score de odds
          analysis.criteriaScores.oddsScore = calculateOddsScore(homeOdd, awayOdd);
          analysis.criteria.oddsQuality = analysis.criteriaScores.oddsScore >= 15;
        }
      }
    } catch (error: any) {
      console.warn(`[GameAnalyzerPro] Could not fetch odds: ${error.message}`);
    }

    // Se não tem odds válidas, rejeitar
    if (!hasValidOdds) {
      return analysis;
    }

    // ========== CRITÉRIO 2: FORMA RECENTE ==========
    try {
      // Simular forma recente (em produção, buscar dados reais)
      // Valores entre 0-15 (0 pontos em 5 jogos até 15 pontos)
      const recentPoints = Math.floor(Math.random() * 16);
      analysis.details.recentPoints = recentPoints;
      
      analysis.criteriaScores.formScore = calculateFormScore(recentPoints);
      analysis.criteria.recentForm = analysis.criteriaScores.formScore >= 10;
    } catch (error: any) {
      console.warn(`[GameAnalyzerPro] Could not calculate form: ${error.message}`);
    }

    // ========== CRITÉRIO 3: HISTÓRICO H2H ==========
    try {
      const h2h = await fetchH2H(game.teams.home.id, game.teams.away.id);

      if (h2h && h2h.length > 0) {
        const lastThree = h2h.slice(0, 3);
        let h2hWins = 0;

        for (const match of lastThree) {
          const homeGoals = match.goals?.home || 0;
          const awayGoals = match.goals?.away || 0;

          if (homeGoals > awayGoals) {
            h2hWins++;
            analysis.details.lastGames.push({
              result: `${homeGoals}-${awayGoals}`,
              goals: homeGoals - awayGoals,
            });
          }
        }

        analysis.details.h2hWins = h2hWins;
        analysis.criteriaScores.h2hScore = calculateH2HScore(h2hWins, h2h.length);
        analysis.criteria.h2hFavorable = analysis.criteriaScores.h2hScore >= 10;
      } else {
        // Sem dados H2H, score neutro
        analysis.criteriaScores.h2hScore = 8;
      }
    } catch (error: any) {
      console.warn(`[GameAnalyzerPro] Could not fetch H2H: ${error.message}`);
      analysis.criteriaScores.h2hScore = 8;
    }

    // ========== CRITÉRIO 4: ESTATÍSTICAS ==========
    try {
      // Simular xG (em produção, buscar dados reais)
      // Valores entre 0.5 e 2.5
      const xG = 0.5 + Math.random() * 2.0;
      analysis.details.xG = xG;
      
      analysis.criteriaScores.statsScore = calculateStatsScore(xG);
      analysis.criteria.statisticsStrong = analysis.criteriaScores.statsScore >= 10;
    } catch (error: any) {
      console.warn(`[GameAnalyzerPro] Could not calculate stats: ${error.message}`);
    }

    // ========== CRITÉRIO 5: VALUE BETTING ==========
    try {
      // Calcular probabilidade real
      const realProb = calculateRealProbability(
        analysis.details.xG,
        analysis.criteriaScores.formScore,
        analysis.criteriaScores.h2hScore
      );
      
      analysis.details.homeWinProbability = realProb;
      
      // Calcular EV
      const ev = calculateEV(realProb, analysis.details.homeOdd);
      analysis.details.expectedValue = ev;
      
      // Value betting: EV > 0 (probabilidade real > implícita)
      analysis.criteria.valueBetting = ev > 0;
      
      // Score de motivação
      analysis.criteriaScores.motivationScore = calculateMotivationScore();
    } catch (error: any) {
      console.warn(`[GameAnalyzerPro] Could not calculate EV: ${error.message}`);
    }

    // ========== CALCULAR STRENGTH SCORE ==========
    const totalScore = 
      analysis.criteriaScores.oddsScore +
      analysis.criteriaScores.formScore +
      analysis.criteriaScores.h2hScore +
      analysis.criteriaScores.statsScore +
      analysis.criteriaScores.motivationScore;
    
    analysis.strengthScore = totalScore;

    // ========== DETERMINAR APROVAÇÃO ==========
    // Aprovado se atender PELO MENOS 3 de 5 critérios E score >= 50
    const criteriasMet = Object.values(analysis.criteria).filter(v => v === true).length;
    analysis.approved = criteriasMet >= 3 && analysis.strengthScore >= 50;

  } catch (error: any) {
    console.error(`[GameAnalyzerPro] Error analyzing game ${game.fixture.id}:`, error.message);
  }

  return analysis;
}

/**
 * Analisar múltiplos jogos com limite de 100 análises
 * Retorna resultados conforme encontra (streaming)
 */
export async function analyzeGamesWithProgressPro(
  games: FootballGame[],
  onProgress: (progress: AnalysisProgressPro, approved: GameAnalysisPro[]) => void
): Promise<GameAnalysisPro[]> {
  console.log(`[GameAnalyzerPro] Starting analysis with MAX_ANALYSES=${MAX_ANALYSES}`);

  const approved: GameAnalysisPro[] = [];
  let analyzed = 0;
  let rejected = 0;

  for (const game of games) {
    // Parar se atingir limite de 100 análises
    if (analyzed >= MAX_ANALYSES) {
      console.log(`[GameAnalyzerPro] Reached analysis limit of ${MAX_ANALYSES}`);
      
      const progress: AnalysisProgressPro = {
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
      const analysis = await analyzeGamePro(game);

      if (analysis === null) {
        // Não é liga principal, pular
        continue;
      }

      analyzed++;

      if (analysis.approved) {
        approved.push(analysis);
        console.log(
          `[GameAnalyzerPro] ✓ APPROVED (${approved.length}/${MAX_APPROVED}): ${analysis.homeTeam} vs ${analysis.awayTeam} (Score: ${analysis.strengthScore}/100)`
        );
      } else {
        rejected++;
        console.log(
          `[GameAnalyzerPro] ✗ REJECTED: ${analysis.homeTeam} vs ${analysis.awayTeam} (Score: ${analysis.strengthScore}/100)`
        );
      }

      // Enviar progresso a cada análise
      const progress: AnalysisProgressPro = {
        analyzed,
        approved: approved.length,
        rejected,
        total: games.length,
        percentage: Math.round((analyzed / games.length) * 100),
        stopped: false,
      };

      onProgress(progress, approved);

      // Se já encontrou 6, pode parar
      if (approved.length >= MAX_APPROVED) {
        console.log(`[GameAnalyzerPro] Found ${MAX_APPROVED} approved games, stopping analysis`);
        
        const finalProgress: AnalysisProgressPro = {
          analyzed,
          approved: approved.length,
          rejected,
          total: games.length,
          percentage: Math.round((analyzed / games.length) * 100),
          stopped: true,
          reason: `Found ${MAX_APPROVED} approved games`,
        };

        onProgress(finalProgress, approved);
        break;
      }

    } catch (error: any) {
      console.error(`[GameAnalyzerPro] Error analyzing game:`, error.message);
      analyzed++;
    }
  }

  // ========== ORDENAR POR STRENGTH SCORE (MAIOR PARA MENOR) ==========
  approved.sort((a, b) => b.strengthScore - a.strengthScore);

  console.log(`[GameAnalyzerPro] Final ranking:`);
  approved.forEach((game, idx) => {
    console.log(`  ${idx + 1}. ${game.homeTeam} vs ${game.awayTeam} - Score: ${game.strengthScore}/100`);
  });

  return approved.slice(0, MAX_APPROVED);
}

/**
 * Gerar relatório de análise
 */
export function getAnalysisReportPro(analyses: GameAnalysisPro[]): string {
  let report = "=== GAME ANALYSIS REPORT (PRO) ===\n\n";

  for (const analysis of analyses) {
    report += `${analysis.homeTeam} vs ${analysis.awayTeam}\n`;
    report += `League: ${analysis.league}\n`;
    report += `Date: ${analysis.date}\n`;
    report += `Strength Score: ${analysis.strengthScore}/100\n`;
    report += `Status: ${analysis.approved ? "✓ APPROVED" : "✗ REJECTED"}\n`;
    report += `\nCriteria:\n`;
    report += `  • Odds Quality: ${analysis.criteria.oddsQuality ? "✓" : "✗"} (${analysis.criteriaScores.oddsScore}/30)\n`;
    report += `  • Recent Form: ${analysis.criteria.recentForm ? "✓" : "✗"} (${analysis.criteriaScores.formScore}/25)\n`;
    report += `  • H2H Favorable: ${analysis.criteria.h2hFavorable ? "✓" : "✗"} (${analysis.criteriaScores.h2hScore}/20)\n`;
    report += `  • Statistics Strong: ${analysis.criteria.statisticsStrong ? "✓" : "✗"} (${analysis.criteriaScores.statsScore}/15)\n`;
    report += `  • Value Betting: ${analysis.criteria.valueBetting ? "✓" : "✗"}\n`;
    report += `\nDetails:\n`;
    report += `  • Home Odd: ${analysis.details.homeOdd}\n`;
    report += `  • Away Odd: ${analysis.details.awayOdd}\n`;
    report += `  • Win Probability: ${analysis.details.homeWinProbability.toFixed(1)}%\n`;
    report += `  • Implied Probability: ${analysis.details.impliedProbability.toFixed(1)}%\n`;
    report += `  • Expected Value: ${(analysis.details.expectedValue * 100).toFixed(2)}%\n`;
    report += `  • Recent Points: ${analysis.details.recentPoints}/15\n`;
    report += `  • H2H Wins: ${analysis.details.h2hWins}/3\n`;
    report += `  • xG: ${analysis.details.xG.toFixed(2)}\n`;
    report += `  • Last Games: ${analysis.details.lastGames.map(g => g.result).join(", ") || "N/A"}\n`;
    report += "\n";
  }

  return report;
}
