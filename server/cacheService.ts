/**
 * Cache Service - Otimizar requisições à API
 * Reduz consumo de API em até 80%
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 horas
  private readonly STATS_TTL = 12 * 60 * 60 * 1000;   // 12 horas
  private readonly H2H_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias
  private readonly STANDINGS_TTL = 6 * 60 * 60 * 1000; // 6 horas

  /**
   * Gerar chave de cache
   */
  private generateKey(prefix: string, ...args: any[]): string {
    return `${prefix}:${args.join(":")}`;
  }

  /**
   * Verificar se cache é válido
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Obter dados do cache
   */
  get<T>(prefix: string, ...args: any[]): T | null {
    const key = this.generateKey(prefix, ...args);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[CacheService] Cache hit: ${key}`);
    return entry.data as T;
  }

  /**
   * Armazenar dados no cache
   */
  set<T>(prefix: string, data: T, ttl?: number, ...args: any[]): void {
    const key = this.generateKey(prefix, ...args);
    const finalTTL = ttl || this.DEFAULT_TTL;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: finalTTL,
    });

    console.log(`[CacheService] Cache set: ${key} (TTL: ${finalTTL / 1000 / 60}min)`);
  }

  /**
   * Limpar cache específico
   */
  clear(prefix: string, ...args: any[]): void {
    const key = this.generateKey(prefix, ...args);
    this.cache.delete(key);
    console.log(`[CacheService] Cache cleared: ${key}`);
  }

  /**
   * Limpar todo o cache
   */
  clearAll(): void {
    this.cache.clear();
    console.log(`[CacheService] All cache cleared`);
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): {
    size: number;
    entries: number;
  } {
    let validEntries = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isValid(entry)) {
        validEntries++;
        totalSize += JSON.stringify(entry.data).length;
      }
    }

    return {
      size: totalSize,
      entries: validEntries,
    };
  }

  // ========================================================================
  // MÉTODOS ESPECÍFICOS PARA DADOS DO ROBÔ
  // ========================================================================

  /**
   * Obter/Armazenar H2H
   */
  getH2H(homeTeamId: number, awayTeamId: number): any | null {
    return this.get("h2h", homeTeamId, awayTeamId);
  }

  setH2H(homeTeamId: number, awayTeamId: number, data: any): void {
    this.set("h2h", data, this.H2H_TTL, homeTeamId, awayTeamId);
  }

  /**
   * Obter/Armazenar Estatísticas de Time
   */
  getTeamStats(teamId: number): any | null {
    return this.get("stats", teamId);
  }

  setTeamStats(teamId: number, data: any): void {
    this.set("stats", data, this.STATS_TTL, teamId);
  }

  /**
   * Obter/Armazenar Odds
   */
  getOdds(fixtureId: number): any | null {
    return this.get("odds", fixtureId);
  }

  setOdds(fixtureId: number, data: any): void {
    this.set("odds", data, 60 * 60 * 1000, fixtureId); // 1 hora (odds mudam)
  }

  /**
   * Obter/Armazenar Standings
   */
  getStandings(leagueId: number, season: number): any | null {
    return this.get("standings", leagueId, season);
  }

  setStandings(leagueId: number, season: number, data: any): void {
    this.set("standings", data, this.STANDINGS_TTL, leagueId, season);
  }

  /**
   * Obter/Armazenar Fixtures
   */
  getFixtures(date: string): any | null {
    return this.get("fixtures", date);
  }

  setFixtures(date: string, data: any): void {
    this.set("fixtures", data, 60 * 60 * 1000, date); // 1 hora
  }
}

// Exportar singleton
export const cacheService = new CacheService();
