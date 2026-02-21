/**
 * Backtesting Service - Validar estratégia com dados históricos
 */

import { GameAnalysis2Goal } from "./gameAnalyzer2GoalMargin";
import { metricsService, GameResult } from "./metricsService";

export interface BacktestConfig {
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  initialBankroll: number; // Banca inicial
  stakePerGame: number;   // Aposta por jogo
  minStrengthScore: number; // Score mínimo
}

export interface BacktestResult {
  config: BacktestConfig;
  totalGamesAnalyzed: number;
  totalGamesApproved: number;
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalStaked: number;
  totalWon: number;
  totalLost: number;
  finalBankroll: number;
  profit: number;
  roi: number;
  avgStrengthScore: number;
  avgMarginProbability: number;
  winsByMargin: {
    by2Goals: number;
    by3Plus: number;
    by1Goal: number;
  };
}

/**
 * Executar backtesting
 */
export async function runBacktest(
  historicalGames: any[],
  analyses: GameAnalysis2Goal[],
  config: BacktestConfig
): Promise<BacktestResult> {
  console.log("[Backtest] Starting backtest...");
  console.log(`[Backtest] Period: ${config.startDate} to ${config.endDate}`);
  console.log(`[Backtest] Initial bankroll: R$ ${config.initialBankroll}`);

  let bankroll = config.initialBankroll;
  let totalWins = 0;
  let totalLosses = 0;
  let totalStaked = 0;
  let totalWon = 0;
  let totalLost = 0;
  let winsByMargin = { by2Goals: 0, by3Plus: 0, by1Goal: 0 };

  // Processar cada análise aprovada
  for (const analysis of analyses) {
    if (!analysis.approved || analysis.strengthScore < config.minStrengthScore) {
      continue;
    }

    // Encontrar resultado real do jogo
    const historicalGame = historicalGames.find(
      g => g.fixture.id === analysis.fixtureId
    );

    if (!historicalGame) {
      console.warn(`[Backtest] Game ${analysis.fixtureId} not found in historical data`);
      continue;
    }

    const homeGoals = historicalGame.goals?.home || 0;
    const awayGoals = historicalGame.goals?.away || 0;
    const margin = homeGoals - awayGoals;

    // Determinar resultado
    let isWin = false;
    let winAmount = 0;

    if (homeGoals > awayGoals) {
      // Time da casa venceu
      if (margin === 2) {
        // Vitória por 2 gols - ACERTO PERFEITO
        isWin = true;
        winAmount = config.stakePerGame * 2.5; // Odd 2.5
        winsByMargin.by2Goals++;
      } else if (margin > 2) {
        // Vitória por 3+ gols - ACERTO MAS MARGEM DIFERENTE
        isWin = true;
        winAmount = config.stakePerGame * 2.0; // Odd 2.0
        winsByMargin.by3Plus++;
      } else if (margin === 1) {
        // Vitória por 1 gol - ACERTO MAS MARGEM ERRADA
        isWin = true;
        winAmount = config.stakePerGame * 1.5; // Odd 1.5
        winsByMargin.by1Goal++;
      }
    }

    // Atualizar bankroll
    totalStaked += config.stakePerGame;

    if (isWin) {
      totalWins++;
      totalWon += winAmount;
      bankroll += (winAmount - config.stakePerGame);
    } else {
      totalLosses++;
      totalLost += config.stakePerGame;
      bankroll -= config.stakePerGame;
    }

    // Registrar no metricsService
    metricsService.addGameResult({
      gameId: analysis.fixtureId.toString(),
      homeTeam: analysis.homeTeam,
      awayTeam: analysis.awayTeam,
      prediction: {
        approved: analysis.approved,
        strengthScore: analysis.strengthScore,
        marginProbability: analysis.details.marginProbability,
      },
      actual: {
        homeGoals,
        awayGoals,
        margin,
      },
      result: isWin ? "correct" : "incorrect",
      stakeAmount: config.stakePerGame,
      winAmount,
    });
  }

  const totalGamesPlayed = totalWins + totalLosses;
  const profit = bankroll - config.initialBankroll;
  const roi = config.initialBankroll > 0 ? (profit / config.initialBankroll) * 100 : 0;

  const avgStrengthScore =
    analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.strengthScore, 0) / analyses.length
      : 0;

  const avgMarginProbability =
    analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.details.marginProbability, 0) / analyses.length
      : 0;

  const result: BacktestResult = {
    config,
    totalGamesAnalyzed: historicalGames.length,
    totalGamesApproved: analyses.length,
    totalGamesPlayed,
    totalWins,
    totalLosses,
    winRate: totalGamesPlayed > 0 ? (totalWins / totalGamesPlayed) * 100 : 0,
    totalStaked,
    totalWon,
    totalLost,
    finalBankroll: bankroll,
    profit,
    roi,
    avgStrengthScore,
    avgMarginProbability,
    winsByMargin,
  };

  console.log("[Backtest] Backtest completed");
  console.log(`[Backtest] Win rate: ${result.winRate.toFixed(2)}%`);
  console.log(`[Backtest] ROI: ${result.roi.toFixed(2)}%`);
  console.log(`[Backtest] Final bankroll: R$ ${result.finalBankroll.toFixed(2)}`);

  return result;
}

/**
 * Gerar relatório de backtesting
 */
export function generateBacktestReport(result: BacktestResult): string {
  let report = "=== RELATÓRIO DE BACKTESTING ===\n\n";

  report += "CONFIGURAÇÃO\n";
  report += `  Período: ${result.config.startDate} a ${result.config.endDate}\n`;
  report += `  Banca Inicial: R$ ${result.config.initialBankroll.toFixed(2)}\n`;
  report += `  Aposta por Jogo: R$ ${result.config.stakePerGame.toFixed(2)}\n`;
  report += `  Score Mínimo: ${result.config.minStrengthScore}/100\n\n`;

  report += "ANÁLISE\n";
  report += `  Total Analisado: ${result.totalGamesAnalyzed}\n`;
  report += `  Total Aprovado: ${result.totalGamesApproved}\n`;
  report += `  Taxa de Aprovação: ${((result.totalGamesApproved / result.totalGamesAnalyzed) * 100).toFixed(1)}%\n\n`;

  report += "RESULTADOS\n";
  report += `  Jogos Apostados: ${result.totalGamesPlayed}\n`;
  report += `  Vitórias: ${result.totalWins}\n`;
  report += `  Derrotas: ${result.totalLosses}\n`;
  report += `  Taxa de Acerto: ${result.winRate.toFixed(2)}%\n\n`;

  report += "MARGEM DE VITÓRIA\n";
  report += `  Vitórias por 2 Gols: ${result.winsByMargin.by2Goals}\n`;
  report += `  Vitórias por 3+ Gols: ${result.winsByMargin.by3Plus}\n`;
  report += `  Vitórias por 1 Gol: ${result.winsByMargin.by1Goal}\n`;
  report += `  Acurácia de Margem: ${result.winsByMargin.by2Goals > 0 ? ((result.winsByMargin.by2Goals / result.totalWins) * 100).toFixed(1) : 0}%\n\n`;

  report += "FINANCEIRO\n";
  report += `  Total Apostado: R$ ${result.totalStaked.toFixed(2)}\n`;
  report += `  Total Ganho: R$ ${result.totalWon.toFixed(2)}\n`;
  report += `  Total Perdido: R$ ${result.totalLost.toFixed(2)}\n`;
  report += `  Lucro: R$ ${result.profit.toFixed(2)}\n`;
  report += `  ROI: ${result.roi.toFixed(2)}%\n`;
  report += `  Banca Final: R$ ${result.finalBankroll.toFixed(2)}\n\n`;

  report += "CONFIANÇA\n";
  report += `  Score Médio: ${result.avgStrengthScore.toFixed(1)}/100\n`;
  report += `  Probabilidade Média de 2 Gols: ${result.avgMarginProbability.toFixed(1)}%\n`;

  return report;
}

/**
 * Comparar múltiplas estratégias
 */
export interface StrategyComparison {
  strategy: string;
  winRate: number;
  roi: number;
  finalBankroll: number;
  avgStrengthScore: number;
}

export function compareStrategies(results: BacktestResult[]): StrategyComparison[] {
  return results.map((result, idx) => ({
    strategy: `Strategy ${idx + 1}`,
    winRate: result.winRate,
    roi: result.roi,
    finalBankroll: result.finalBankroll,
    avgStrengthScore: result.avgStrengthScore,
  }));
}
