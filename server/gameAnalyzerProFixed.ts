import { ApiFootballService } from "./apiFootballService";
import { JSONStorage } from "./jsonStorage";

interface Game {
  id: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  homeId: number;
  awayId: number;
  homeOdd: number;
  awayOdd: number;
  score: number;
  criteria: {
    oddsAvailable: boolean;
    homeFavorite: boolean;
    oddsDifference: number;
    recentForm: boolean;
    valueBetting: boolean;
  };
  status: "approved" | "rejected";
}

export class GameAnalyzerProFixed {
  private api: ApiFootballService;
  private storage: JSONStorage;
  // V39: não limitar por padrão. O limite passa a ser controlado
  // pela quantidade de fixtures retornadas e pelo limite de requisições da API.
  private maxAnalyses = Number.POSITIVE_INFINITY;

  constructor(apiKey?: string) {
    this.api = new ApiFootballService(apiKey);
    this.storage = new JSONStorage();
  }

  /**
   * Calcula score de forma REALISTA e PROGRESSIVA
   * Cada critério vale 0-20 pontos
   * Total: 0-100 pontos
   */
  private calculateScore(game: any, h2h: any[]): number {
    let score = 0;

    // Critério 1: Odds Disponíveis (0 ou 20 pontos)
    const homeOdd = parseFloat(game.homeOdd);
    const awayOdd = parseFloat(game.awayOdd);

    if (!homeOdd || !awayOdd || homeOdd <= 0 || awayOdd <= 0) {
      return 0; // Sem odds, score zero
    }

    score += 20; // Odds disponíveis

    // Critério 2: Home é Favorito (0-20 pontos PROGRESSIVOS)
    // Antes: if (homeOdd >= 2.0) return 0; (IMPOSSÍVEL)
    // Depois: Scoring progressivo
    if (homeOdd < 1.5) {
      score += 20; // Favorito forte
    } else if (homeOdd < 1.8) {
      score += 18; // Favorito moderado
    } else if (homeOdd < 2.0) {
      score += 15; // Favorito fraco
    } else if (homeOdd < 2.5) {
      score += 10; // Ligeiramente favorito
    } else {
      score += 5; // Não é favorito (mas ainda conta pontos)
    }

    // Critério 3: Diferença de Odds (0-20 pontos PROGRESSIVOS)
    const oddsDiff = Math.abs(awayOdd - homeOdd);

    if (oddsDiff >= 2.0) {
      score += 20; // Diferença grande
    } else if (oddsDiff >= 1.5) {
      score += 18; // Diferença boa
    } else if (oddsDiff >= 1.0) {
      score += 15; // Diferença moderada
    } else if (oddsDiff >= 0.5) {
      score += 10; // Diferença pequena
    } else {
      score += 5; // Diferença muito pequena
    }

    // Critério 4: Histórico Recente (0-20 pontos)
    if (h2h && h2h.length > 0) {
      const recentGames = h2h.slice(0, 3);
      let homeWins = 0;

      for (const match of recentGames) {
        if (match.goals?.home > match.goals?.away) {
          homeWins++;
        }
      }

      if (homeWins === recentGames.length) {
        score += 20; // Ganhou todos
      } else if (homeWins >= recentGames.length * 0.66) {
        score += 15; // Ganhou maioria
      } else if (homeWins > 0) {
        score += 10; // Ganhou alguns
      } else {
        score += 3; // Não ganhou nenhum
      }
    } else {
      score += 8; // Sem histórico, score neutro
    }

    // Critério 5: Value Betting (0-20 pontos)
    // Probabilidade implícita vs probabilidade real
    const impliedProb = 1 / homeOdd;

    if (impliedProb < 0.5) {
      score += 20; // Bom valor
    } else if (impliedProb < 0.6) {
      score += 18; // Valor moderado
    } else if (impliedProb < 0.7) {
      score += 15; // Valor fraco
    } else {
      score += 10; // Pouco valor
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Analisa um jogo individual
   */
  private async analyzeGame(fixture: any): Promise<Game | null> {
    try {
      const homeTeam = fixture.teams?.home?.name || "Unknown";
      const awayTeam = fixture.teams?.away?.name || "Unknown";
      const league = fixture.league?.name || "Unknown";

      console.log(`[GameAnalyzerProFixed] Analyzing: ${homeTeam} vs ${awayTeam}`);

      // Buscar odds
      const oddsData = await this.api.getOdds(fixture.id);

      if (!oddsData || !oddsData.response || oddsData.response.length === 0) {
        console.log(
          `[GameAnalyzerProFixed] ✗ No odds available for ${homeTeam} vs ${awayTeam}`
        );
        return null;
      }

      const odds = oddsData.response[0];
      const bookmaker = odds.bookmakers?.[0];

      if (!bookmaker || !bookmaker.bets || bookmaker.bets.length === 0) {
        console.log(
          `[GameAnalyzerProFixed] ✗ No bookmaker data for ${homeTeam} vs ${awayTeam}`
        );
        return null;
      }

      const bet = bookmaker.bets[0];
      const homeOdd = bet.values?.[0]?.odd;
      const awayOdd = bet.values?.[2]?.odd;

      if (!homeOdd || !awayOdd) {
        console.log(
          `[GameAnalyzerProFixed] ✗ Missing odds for ${homeTeam} vs ${awayTeam}`
        );
        return null;
      }

      // Buscar H2H
      const h2hData = await this.api.getH2H(
        fixture.teams.home.id,
        fixture.teams.away.id,
        3
      );
      const h2h = h2hData?.response || [];

      // Calcular score
      const score = this.calculateScore(
        {
          homeOdd,
          awayOdd,
        },
        h2h
      );

      const game: Game = {
        id: fixture.id,
        homeTeam,
        awayTeam,
        league,
        homeId: fixture.teams.home.id,
        awayId: fixture.teams.away.id,
        homeOdd,
        awayOdd,
        score,
        criteria: {
          oddsAvailable: true,
          homeFavorite: homeOdd < 2.5,
          oddsDifference: Math.abs(awayOdd - homeOdd),
          recentForm: h2h.length > 0,
          valueBetting: 1 / homeOdd < 0.6,
        },
        status: score >= 50 ? "approved" : "rejected", // Threshold: 50/100
      };

      console.log(
        `[GameAnalyzerProFixed] ${game.status.toUpperCase()}: ${homeTeam} vs ${awayTeam} (Score: ${score}/100)`
      );

      return game;
    } catch (error) {
      console.error(
        `[GameAnalyzerProFixed] Error analyzing game:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Executa análise completa
   */
  async analyze(apiKey?: string): Promise<any> {
    try {
      console.log(
        "[GameAnalyzerProFixed] Starting analysis with FIXED strategy..."
      );

      if (apiKey) {
        this.api = new ApiFootballService(apiKey);
      }

      // Verificar status
      const status = await this.api.getStatus();
      console.log(
        `[GameAnalyzerProFixed] API Status: ${status.requests_remaining}/${status.requests_limit_day} remaining`
      );

      // Buscar fixtures
      const fixturesData = await this.api.getFixtures();

      if (!fixturesData || !fixturesData.response || fixturesData.response.length === 0) {
        console.log("[GameAnalyzerProFixed] No fixtures found");
        return {
          success: true,
          games: [],
          message: "No fixtures found for today",
        };
      }

      const fixtures = fixturesData.response;
      const planned = Math.min(fixtures.length, Number.isFinite(this.maxAnalyses) ? this.maxAnalyses : fixtures.length);
      console.log(
        `[GameAnalyzerProFixed] Found ${fixtures.length} fixtures, analyzing ${planned}...`
      );

      const allGames: Game[] = [];
      let analyzed = 0;

      for (const fixture of fixtures.slice(0, planned)) {
        const game = await this.analyzeGame(fixture);

        if (game) {
          allGames.push(game);
          analyzed++;

          const progress = ((analyzed / planned) * 100).toFixed(1);
          console.log(
            `[GameAnalyzerProFixed] Progress: ${analyzed}/${planned} (${progress}%)`
          );
        }
      }

      // Separar aprovados e rejeitados
      const approvedGames = allGames.filter((g) => g.status === "approved");
      const rejectedGames = allGames.filter((g) => g.status === "rejected");

      // Ordenar por score (maior primeiro)
      approvedGames.sort((a, b) => b.score - a.score);

      console.log(
        `[GameAnalyzerProFixed] Analysis complete: ${approvedGames.length} approved, ${rejectedGames.length} rejected`
      );

      // FALLBACK INTELIGENTE: Se nenhum aprovado, retorna top 6 mesmo assim
      let finalGames = approvedGames.slice(0, 6);

      if (finalGames.length === 0 && allGames.length > 0) {
        console.log(
          "[GameAnalyzerProFixed] No approved games, using fallback (top 6 by score)..."
        );
        finalGames = allGames.sort((a, b) => b.score - a.score).slice(0, 6);

        // Marcar como "fallback"
        finalGames.forEach((g) => {
          g.status = "approved"; // Mudar status para aprovado
        });
      }

      // Salvar dados
      await this.storage.saveGames(finalGames);
      await this.storage.saveAnalysisHistory({
        date: new Date().toISOString().split("T")[0],
        totalGames: allGames.length,
        analyzedGames: analyzed,
        approvedGames: finalGames.length,
        rejectedGames: rejectedGames.length,
        approvalRate: ((finalGames.length / allGames.length) * 100).toFixed(1),
      });

      return {
        success: true,
        games: finalGames,
        progress: {
          analyzed: analyzed,
          approved: finalGames.length,
          rejected: rejectedGames.length,
          total: fixtures.length,
          percentage: ((analyzed / fixtures.length) * 100).toFixed(1),
        },
        message: `Analysis complete: ${finalGames.length} games approved`,
      };
    } catch (error) {
      console.error(
        "[GameAnalyzerProFixed] Error:",
        error instanceof Error ? error.message : error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
