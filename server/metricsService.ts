/**
 * Metrics Service - Rastrear performance do robô
 */

export interface AnalysisMetrics {
  // Análise
  totalAnalyzed: number;        // Jogos analisados
  totalApproved: number;        // Jogos aprovados
  approvalRate: number;         // % de aprovação
  
  // Resultados
  correctPredictions: number;   // Vitórias corretas
  incorrectPredictions: number; // Vitórias erradas
  accuracy: number;             // % de acerto
  
  // Margem de vitória
  victoryBy2Goals: number;      // Vitórias por 2 gols
  victoryBy3Plus: number;       // Vitórias por 3+ gols
  victoryBy1Goal: number;       // Vitórias por 1 gol
  marginAccuracy: number;       // % de acerto na margem
  
  // Financeiro
  totalStaked: number;          // Total apostado
  totalWon: number;             // Total ganho
  totalLost: number;            // Total perdido
  roi: number;                  // Retorno sobre investimento (%)
  profit: number;               // Lucro absoluto
  
  // Confiança
  avgStrengthScore: number;     // Score médio
  avgMarginProbability: number; // Probabilidade média de 2 gols
  
  // Período
  startDate: string;
  endDate: string;
  daysAnalyzed: number;
}

export interface GameResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  prediction: {
    approved: boolean;
    strengthScore: number;
    marginProbability: number;
  };
  actual: {
    homeGoals: number;
    awayGoals: number;
    margin: number;
  };
  result: "correct" | "incorrect" | "pending";
  stakeAmount: number;
  winAmount: number;
}

class MetricsService {
  private results: GameResult[] = [];
  private startDate: Date = new Date();

  /**
   * Adicionar resultado de jogo
   */
  addGameResult(result: GameResult): void {
    this.results.push(result);
    console.log(`[MetricsService] Game result added: ${result.homeTeam} vs ${result.awayTeam}`);
  }

  /**
   * Atualizar resultado de jogo
   */
  updateGameResult(gameId: string, homeGoals: number, awayGoals: number): void {
    const result = this.results.find(r => r.gameId === gameId);
    
    if (!result) {
      console.warn(`[MetricsService] Game ${gameId} not found`);
      return;
    }

    result.actual.homeGoals = homeGoals;
    result.actual.awayGoals = awayGoals;
    result.actual.margin = homeGoals - awayGoals;

    // Determinar resultado
    if (result.prediction.approved) {
      const correctMargin = result.actual.margin === 2;
      const correctWin = result.actual.homeGoals > result.actual.awayGoals;

      if (correctWin && correctMargin) {
        result.result = "correct";
        result.winAmount = result.stakeAmount * 2; // Exemplo: odd 2.0
      } else if (correctWin) {
        result.result = "incorrect"; // Ganhou mas não com 2 gols
        result.winAmount = result.stakeAmount * 1.5; // Odd menor
      } else {
        result.result = "incorrect";
        result.winAmount = 0;
      }
    }

    console.log(`[MetricsService] Game result updated: ${result.homeTeam} vs ${result.awayTeam} (${result.result})`);
  }

  /**
   * Calcular métricas
   */
  calculateMetrics(): AnalysisMetrics {
    const totalAnalyzed = this.results.length;
    const totalApproved = this.results.filter(r => r.prediction.approved).length;
    
    const correctPredictions = this.results.filter(r => r.result === "correct").length;
    const incorrectPredictions = this.results.filter(r => r.result === "incorrect").length;
    const pendingPredictions = this.results.filter(r => r.result === "pending").length;

    // Margem de vitória
    const correctMargin = this.results.filter(
      r => r.actual.margin === 2 && r.actual.homeGoals > r.actual.awayGoals
    ).length;
    const correctBy3Plus = this.results.filter(
      r => r.actual.margin > 2 && r.actual.homeGoals > r.actual.awayGoals
    ).length;
    const correctBy1Goal = this.results.filter(
      r => r.actual.margin === 1 && r.actual.homeGoals > r.actual.awayGoals
    ).length;

    // Financeiro
    const totalStaked = this.results.reduce((sum, r) => sum + r.stakeAmount, 0);
    const totalWon = this.results.reduce((sum, r) => sum + r.winAmount, 0);
    const totalLost = totalStaked - totalWon;
    const profit = totalWon - totalStaked;
    const roi = totalStaked > 0 ? (profit / totalStaked) * 100 : 0;

    // Confiança
    const avgStrengthScore = totalApproved > 0
      ? this.results
          .filter(r => r.prediction.approved)
          .reduce((sum, r) => sum + r.prediction.strengthScore, 0) / totalApproved
      : 0;

    const avgMarginProbability = totalApproved > 0
      ? this.results
          .filter(r => r.prediction.approved)
          .reduce((sum, r) => sum + r.prediction.marginProbability, 0) / totalApproved
      : 0;

    // Período
    const endDate = new Date();
    const daysAnalyzed = Math.ceil(
      (endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalAnalyzed,
      totalApproved,
      approvalRate: totalAnalyzed > 0 ? (totalApproved / totalAnalyzed) * 100 : 0,
      correctPredictions,
      incorrectPredictions,
      accuracy: (correctPredictions + incorrectPredictions) > 0
        ? (correctPredictions / (correctPredictions + incorrectPredictions)) * 100
        : 0,
      victoryBy2Goals: correctMargin,
      victoryBy3Plus: correctBy3Plus,
      victoryBy1Goal: correctBy1Goal,
      marginAccuracy: correctPredictions > 0
        ? (correctMargin / correctPredictions) * 100
        : 0,
      totalStaked,
      totalWon,
      totalLost,
      roi,
      profit,
      avgStrengthScore,
      avgMarginProbability,
      startDate: this.startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysAnalyzed,
    };
  }

  /**
   * Gerar relatório de métricas
   */
  generateReport(): string {
    const metrics = this.calculateMetrics();

    let report = "=== RELATÓRIO DE MÉTRICAS ===\n\n";
    
    report += "ANÁLISE\n";
    report += `  Total Analisado: ${metrics.totalAnalyzed}\n`;
    report += `  Total Aprovado: ${metrics.totalApproved}\n`;
    report += `  Taxa de Aprovação: ${metrics.approvalRate.toFixed(1)}%\n\n`;

    report += "RESULTADOS\n";
    report += `  Previsões Corretas: ${metrics.correctPredictions}\n`;
    report += `  Previsões Incorretas: ${metrics.incorrectPredictions}\n`;
    report += `  Acurácia: ${metrics.accuracy.toFixed(1)}%\n\n`;

    report += "MARGEM DE VITÓRIA\n";
    report += `  Vitórias por 2 Gols: ${metrics.victoryBy2Goals}\n`;
    report += `  Vitórias por 3+ Gols: ${metrics.victoryBy3Plus}\n`;
    report += `  Vitórias por 1 Gol: ${metrics.victoryBy1Goal}\n`;
    report += `  Acurácia de Margem: ${metrics.marginAccuracy.toFixed(1)}%\n\n`;

    report += "FINANCEIRO\n";
    report += `  Total Apostado: R$ ${metrics.totalStaked.toFixed(2)}\n`;
    report += `  Total Ganho: R$ ${metrics.totalWon.toFixed(2)}\n`;
    report += `  Total Perdido: R$ ${metrics.totalLost.toFixed(2)}\n`;
    report += `  Lucro: R$ ${metrics.profit.toFixed(2)}\n`;
    report += `  ROI: ${metrics.roi.toFixed(2)}%\n\n`;

    report += "CONFIANÇA\n";
    report += `  Score Médio: ${metrics.avgStrengthScore.toFixed(1)}/100\n`;
    report += `  Probabilidade Média de 2 Gols: ${metrics.avgMarginProbability.toFixed(1)}%\n\n`;

    report += "PERÍODO\n";
    report += `  Data Inicial: ${metrics.startDate}\n`;
    report += `  Data Final: ${metrics.endDate}\n`;
    report += `  Dias Analisados: ${metrics.daysAnalyzed}\n`;

    return report;
  }

  /**
   * Resetar métricas
   */
  reset(): void {
    this.results = [];
    this.startDate = new Date();
    console.log("[MetricsService] Metrics reset");
  }

  /**
   * Exportar dados para análise
   */
  exportData(): GameResult[] {
    return JSON.parse(JSON.stringify(this.results));
  }

  /**
   * Importar dados
   */
  importData(data: GameResult[]): void {
    this.results = data;
    console.log(`[MetricsService] Imported ${data.length} game results`);
  }
}

// Exportar singleton
export const metricsService = new MetricsService();
