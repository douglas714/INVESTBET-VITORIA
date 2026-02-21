import {
  fetchH2H,
  fetchOdds,
  fetchTeamStats,
  fetchStandings,
  fetchFixturesByDate,
  FootballGame,
} from "./apiFootballService";

// ============================================================================
// INTERFACES
// ============================================================================

export interface GameAnalysis2Goal {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  
  // Scores dos critérios (0-100)
  marginScore: number;          // 0-25: Histórico de margem de vitória
  attackDefenseScore: number;   // 0-25: Força de ataque + defesa
  recentFormScore: number;      // 0-20: Forma recente qualificada
  standingsScore: number;       // 0-15: Posição na tabela
  marketScore: number;          // 0-15: Liquidez + consenso de mercado
  
  // Score total e aprovação
  strengthScore: number;        // 0-100: Soma de todos os critérios
  approved: boolean;            // Aprovado para aposta
  criteriasMet: number;         // Quantos critérios passaram (0-5)
  
  // Detalhes da análise
  details: {
    homeOdd: number;
    awayOdd: number;
    h2hWins: number;            // Vitórias em H2H
    h2hWinsBy2Goals: number;    // Vitórias por exatamente 2 gols
    h2hWinsBy3Plus: number;     // Vitórias por 3+ gols
    h2hWinsBy1Goal: number;     // Vitórias por 1 gol
    xG: number;                 // Expected Goals (ataque)
    xGA: number;                // Expected Goals Against (defesa)
    recentPoints: number;       // Pontos nos últimos 5 jogos
    recentWins: number;         // Vitórias nos últimos 5 jogos
    recentWinsBy2Plus: number;  // Vitórias por 2+ gols nos últimos 5
    position: number;           // Posição na tabela
    bookmakers: number;         // Número de casas de apostas
    confidence: number;         // 0-100: Nível de confiança
    marginProbability: number;  // Probabilidade de vitória por 2 gols
    analysisTimestamp: string;  // Quando foi feita a análise
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

// ============================================================================
// FUNÇÕES DE CÁLCULO
// ============================================================================

/**
 * Calcular score de margem de vitória (0-25)
 * Prioriza vitórias por 2 gols
 */
function calculateMarginScore(h2hGames: any[]): {
  score: number;
  winsBy2: number;
  winsBy3Plus: number;
  winsBy1: number;
} {
  let score2Goals = 0;
  let score3Plus = 0;
  let score1Goal = 0;
  let winsBy2 = 0;
  let winsBy3Plus = 0;
  let winsBy1 = 0;
  
  for (const match of h2hGames.slice(0, 5)) {
    const homeGoals = match.goals?.home || 0;
    const awayGoals = match.goals?.away || 0;
    const margin = homeGoals - awayGoals;
    
    if (margin === 2) {
      score2Goals += 3;
      winsBy2++;
    } else if (margin > 2) {
      score3Plus += 2;
      winsBy3Plus++;
    } else if (margin === 1) {
      score1Goal += 1;
      winsBy1++;
    }
  }
  
  const totalScore = score2Goals + score3Plus + score1Goal;
  let finalScore = 0;
  
  if (winsBy2 >= 2) finalScore = 25;           // 2+ vitórias por 2 gols
  else if (winsBy2 === 1) finalScore = 20;    // 1 vitória por 2 gols
  else if (winsBy3Plus >= 2) finalScore = 18; // 2+ vitórias por 3+ gols
  else if (totalScore >= 3) finalScore = 15;  // Histórico de vitórias
  else if (totalScore >= 1) finalScore = 10;  // Pelo menos 1 vitória
  else finalScore = 5;
  
  return { score: finalScore, winsBy2, winsBy3Plus, winsBy1 };
}

/**
 * Calcular score de ataque + defesa (0-25)
 * Ideal: xG alto (1.5+) e xGA baixo (0.8-)
 */
function calculateAttackDefenseScore(stats: any): {
  score: number;
  xG: number;
  xGA: number;
} {
  const xG = stats?.statistics?.[0]?.expected_goals || 0;
  const xGA = stats?.statistics?.[0]?.expected_goals_against || 0;
  
  let score = 0;
  
  // Ataque (0-15 pontos)
  if (xG >= 1.6) score += 15;
  else if (xG >= 1.4) score += 13;
  else if (xG >= 1.2) score += 11;
  else if (xG >= 1.0) score += 9;
  else if (xG >= 0.8) score += 6;
  else score += 3;
  
  // Defesa (0-10 pontos)
  if (xGA <= 0.7) score += 10;
  else if (xGA <= 0.9) score += 8;
  else if (xGA <= 1.1) score += 6;
  else if (xGA <= 1.3) score += 4;
  else score += 2;
  
  return { score: Math.min(score, 25), xG, xGA };
}

/**
 * Calcular score de forma recente (0-20)
 * Prioriza vitórias, especialmente por 2+ gols
 */
function calculateRecentFormScore(lastGames: any[]): {
  score: number;
  points: number;
  wins: number;
  winsBy2Plus: number;
} {
  let points = 0;
  let wins = 0;
  let winsBy2Plus = 0;
  
  for (const game of lastGames.slice(0, 5)) {
    const homeGoals = game.goals?.home || 0;
    const awayGoals = game.goals?.away || 0;
    
    if (homeGoals > awayGoals) {
      wins++;
      const margin = homeGoals - awayGoals;
      points += 3;
      
      if (margin >= 2) {
        winsBy2Plus++;
        points += 2;  // Bônus por margem de 2+
      }
    } else if (homeGoals === awayGoals) {
      points += 1;
    }
  }
  
  let finalScore = 0;
  
  if (wins >= 4 && winsBy2Plus >= 2) finalScore = 20;
  else if (wins >= 4 && winsBy2Plus >= 1) finalScore = 18;
  else if (wins >= 3 && winsBy2Plus >= 1) finalScore = 16;
  else if (wins >= 3) finalScore = 14;
  else if (wins >= 2) finalScore = 12;
  else if (wins >= 1) finalScore = 10;
  else if (points >= 3) finalScore = 7;
  else finalScore = 3;
  
  return { score: finalScore, points, wins, winsBy2Plus };
}

/**
 * Calcular score de posição na tabela (0-15)
 */
function calculateStandingsScore(position: number): number {
  if (position <= 4) return 15;    // Top 4
  if (position <= 8) return 12;    // Top 8
  if (position <= 12) return 10;   // Meio de tabela
  if (position <= 16) return 7;    // Abaixo da média
  return 4;
}

/**
 * Calcular score de mercado (0-15)
 * Liquidez + consenso de odds
 */
function calculateMarketScore(bookmakers: number, homeOdd: number): number {
  let liquidityScore = 0;
  
  if (bookmakers >= 15) liquidityScore = 10;
  else if (bookmakers >= 10) liquidityScore = 8;
  else if (bookmakers >= 6) liquidityScore = 6;
  else if (bookmakers >= 3) liquidityScore = 4;
  else liquidityScore = 2;
  
  let oddScore = 0;
  
  if (homeOdd >= 1.5 && homeOdd <= 2.5) oddScore = 5;  // Ideal
  else if (homeOdd >= 1.3 && homeOdd <= 3.0) oddScore = 4;
  else if (homeOdd >= 1.2 && homeOdd <= 3.5) oddScore = 3;
  else oddScore = 1;
  
  return liquidityScore + oddScore;
}

/**
 * Calcular probabilidade de vitória por 2 gols
 */
function calculateMarginProbability(
  h2hWinsBy2Goals: number,
  totalH2H: number,
  xG: number,
  recentFormScore: number
): number {
  // Probabilidade histórica
  const h2hProb = totalH2H > 0 ? (h2hWinsBy2Goals / totalH2H) * 100 : 0;
  
  // Probabilidade baseada em xG
  // xG de 1.5+ = ~40% de chance de 2+ gols
  const xGProb = Math.min(xG * 25, 50);
  
  // Probabilidade baseada em forma
  const formProb = (recentFormScore / 20) * 30;
  
  // Média ponderada
  return (h2hProb * 0.4 + xGProb * 0.35 + formProb * 0.25);
}

// ============================================================================
// ANÁLISE PRINCIPAL
// ============================================================================

/**
 * Analisar um jogo com estratégia 2-Goal Margin
 */
export async function analyzeGameFor2GoalMargin(
  game: FootballGame
): Promise<GameAnalysis2Goal | null> {
  const analysis: GameAnalysis2Goal = {
    fixtureId: game.fixture.id,
    homeTeam: game.teams.home.name,
    awayTeam: game.teams.away.name,
    league: game.league.name,
    date: game.fixture.date,
    marginScore: 0,
    attackDefenseScore: 0,
    recentFormScore: 0,
    standingsScore: 0,
    marketScore: 0,
    strengthScore: 0,
    approved: false,
    criteriasMet: 0,
    details: {
      homeOdd: 0,
      awayOdd: 0,
      h2hWins: 0,
      h2hWinsBy2Goals: 0,
      h2hWinsBy3Plus: 0,
      h2hWinsBy1Goal: 0,
      xG: 0,
      xGA: 0,
      recentPoints: 0,
      recentWins: 0,
      recentWinsBy2Plus: 0,
      position: 999,
      bookmakers: 0,
      confidence: 0,
      marginProbability: 0,
      analysisTimestamp: new Date().toISOString(),
    },
  };

  try {
    // ========== CRITÉRIO 1: MARGEM DE VITÓRIA HISTÓRICA ==========
    const h2h = await fetchH2H(game.teams.home.id, game.teams.away.id);
    
    let h2hWins = 0;
    for (const match of h2h.slice(0, 5)) {
      const homeGoals = match.goals?.home || 0;
      const awayGoals = match.goals?.away || 0;
      
      if (homeGoals > awayGoals) {
        h2hWins++;
      }
    }
    
    const marginResult = calculateMarginScore(h2h);
    analysis.marginScore = marginResult.score;
    analysis.details.h2hWins = h2hWins;
    analysis.details.h2hWinsBy2Goals = marginResult.winsBy2;
    analysis.details.h2hWinsBy3Plus = marginResult.winsBy3Plus;
    analysis.details.h2hWinsBy1Goal = marginResult.winsBy1;
    
    // ========== CRITÉRIO 2: ATAQUE + DEFESA ==========
    const homeStats = await fetchTeamStats(game.teams.home.id);
    const attackDefenseResult = calculateAttackDefenseScore(homeStats);
    analysis.attackDefenseScore = attackDefenseResult.score;
    analysis.details.xG = attackDefenseResult.xG;
    analysis.details.xGA = attackDefenseResult.xGA;
    
    // ========== CRITÉRIO 3: FORMA RECENTE ==========
    // Buscar últimos 5 jogos do time
    const recentGames = h2h.slice(0, 5);  // Usar H2H como proxy
    const formResult = calculateRecentFormScore(recentGames);
    analysis.recentFormScore = formResult.score;
    analysis.details.recentPoints = formResult.points;
    analysis.details.recentWins = formResult.wins;
    analysis.details.recentWinsBy2Plus = formResult.winsBy2Plus;
    
    // ========== CRITÉRIO 4: POSIÇÃO NA TABELA ==========
    const standings = await fetchStandings(game.league.id, game.league.season);
    let homePosition = 999;
    
    if (standings?.standings?.[0]) {
      const homeStanding = standings.standings[0].find(
        (t: any) => t.team.id === game.teams.home.id
      );
      homePosition = homeStanding?.rank || 999;
    }
    
    analysis.standingsScore = calculateStandingsScore(homePosition);
    analysis.details.position = homePosition;
    
    // ========== CRITÉRIO 5: MERCADO ==========
    const odds = await fetchOdds(game.fixture.id);
    if (odds && odds.length > 0) {
      analysis.details.homeOdd = odds[0]?.values?.home || 0;
      analysis.details.awayOdd = odds[0]?.values?.away || 0;
      analysis.details.bookmakers = odds.length;
      analysis.marketScore = calculateMarketScore(
        odds.length,
        analysis.details.homeOdd
      );
    }
    
    // ========== CALCULAR STRENGTH SCORE TOTAL ==========
    analysis.strengthScore =
      analysis.marginScore +
      analysis.attackDefenseScore +
      analysis.recentFormScore +
      analysis.standingsScore +
      analysis.marketScore;
    
    // ========== CONTAR CRITÉRIOS APROVADOS ==========
    const criteriaThresholds = {
      margin: 10,
      attackDefense: 12,
      recentForm: 10,
      standings: 7,
      market: 5,
    };
    
    const criteriasMet = [
      analysis.marginScore >= criteriaThresholds.margin,
      analysis.attackDefenseScore >= criteriaThresholds.attackDefense,
      analysis.recentFormScore >= criteriaThresholds.recentForm,
      analysis.standingsScore >= criteriaThresholds.standings,
      analysis.marketScore >= criteriaThresholds.market,
    ].filter(c => c).length;
    
    analysis.criteriasMet = criteriasMet;
    
    // ========== CALCULAR PROBABILIDADE DE MARGEM DE 2 GOLS ==========
    analysis.details.marginProbability = calculateMarginProbability(
      analysis.details.h2hWinsBy2Goals,
      h2h.length,
      analysis.details.xG,
      analysis.recentFormScore
    );
    
    // ========== APROVAÇÃO FINAL ==========
    // Aprovado se: 4+ critérios E score >= 70
    analysis.approved = criteriasMet >= 4 && analysis.strengthScore >= 70;
    analysis.details.confidence = analysis.strengthScore;
    
  } catch (error: any) {
    console.error(`[GameAnalyzer2Goal] Error analyzing game ${game.fixture.id}:`, error.message);
  }

  return analysis;
}

// ============================================================================
// ANÁLISE EM BATCH
// ============================================================================

/**
 * Analisar múltiplos jogos com limite de 6 aprovados
 */
export async function analyzeGamesFor2GoalMargin(
  games: FootballGame[],
  onProgress?: (progress: AnalysisProgress, approved: GameAnalysis2Goal[]) => void
): Promise<GameAnalysis2Goal[]> {
  const approved: GameAnalysis2Goal[] = [];
  let analyzed = 0;
  let rejected = 0;
  
  console.log(`[GameAnalyzer2Goal] Starting analysis with ${games.length} games...`);
  
  for (let i = 0; i < games.length && approved.length < 6; i++) {
    const game = games[i];
    
    try {
      const analysis = await analyzeGameFor2GoalMargin(game);
      
      if (analysis === null) {
        continue;
      }
      
      analyzed++;
      
      if (analysis.approved) {
        approved.push(analysis);
        console.log(
          `[GameAnalyzer2Goal] ✓ APPROVED (${approved.length}/6): ` +
          `${analysis.homeTeam} vs ${analysis.awayTeam} ` +
          `(Score: ${analysis.strengthScore}/100, Margin Prob: ${analysis.details.marginProbability.toFixed(1)}%)`
        );
      } else {
        rejected++;
        console.log(
          `[GameAnalyzer2Goal] ✗ REJECTED: ${analysis.homeTeam} vs ${analysis.awayTeam} ` +
          `(Score: ${analysis.strengthScore}/100, Criteria: ${analysis.criteriasMet}/5)`
        );
      }
      
      if (onProgress) {
        onProgress(
          {
            analyzed,
            approved: approved.length,
            rejected,
            total: games.length,
            percentage: Math.round(((i + 1) / games.length) * 100),
            stopped: false,
          },
          approved
        );
      }
      
    } catch (error: any) {
      console.error(`[GameAnalyzer2Goal] Error analyzing game:`, error.message);
      analyzed++;
    }
  }
  
  // Ordenar por strength score (maior para menor)
  approved.sort((a, b) => b.strengthScore - a.strengthScore);
  
  console.log(`[GameAnalyzer2Goal] Final ranking:`);
  approved.forEach((game, idx) => {
    console.log(
      `  ${idx + 1}. ${game.homeTeam} vs ${game.awayTeam} - ` +
      `Score: ${game.strengthScore}/100, Margin Prob: ${game.details.marginProbability.toFixed(1)}%`
    );
  });
  
  return approved.slice(0, 6);
}

/**
 * Gerar relatório de análise
 */
export function getAnalysisReport(analyses: GameAnalysis2Goal[]): string {
  let report = "=== ANÁLISE 2-GOAL MARGIN ===\n\n";
  
  for (const analysis of analyses) {
    report += `${analysis.homeTeam} vs ${analysis.awayTeam}\n`;
    report += `Liga: ${analysis.league}\n`;
    report += `Data: ${analysis.date}\n`;
    report += `Score de Força: ${analysis.strengthScore}/100\n`;
    report += `Status: ${analysis.approved ? "✓ APROVADO" : "✗ REJEITADO"}\n`;
    report += `Critérios Atendidos: ${analysis.criteriasMet}/5\n`;
    report += `\nScores dos Critérios:\n`;
    report += `  • Margem de Vitória: ${analysis.marginScore}/25\n`;
    report += `  • Ataque + Defesa: ${analysis.attackDefenseScore}/25\n`;
    report += `  • Forma Recente: ${analysis.recentFormScore}/20\n`;
    report += `  • Posição na Tabela: ${analysis.standingsScore}/15\n`;
    report += `  • Mercado: ${analysis.marketScore}/15\n`;
    report += `\nDetalhes:\n`;
    report += `  • Odd da Casa: ${analysis.details.homeOdd}\n`;
    report += `  • Odd do Visitante: ${analysis.details.awayOdd}\n`;
    report += `  • Vitórias em H2H: ${analysis.details.h2hWins}\n`;
    report += `  • Vitórias por 2 Gols: ${analysis.details.h2hWinsBy2Goals}\n`;
    report += `  • xG (Ataque): ${analysis.details.xG.toFixed(2)}\n`;
    report += `  • xGA (Defesa): ${analysis.details.xGA.toFixed(2)}\n`;
    report += `  • Posição: ${analysis.details.position}º\n`;
    report += `  • Casas de Aposta: ${analysis.details.bookmakers}\n`;
    report += `  • Probabilidade de 2 Gols: ${analysis.details.marginProbability.toFixed(1)}%\n`;
    report += `\n`;
  }
  
  return report;
}
