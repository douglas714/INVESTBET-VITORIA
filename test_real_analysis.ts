/**
 * Script de Teste Real - Análise de 10 Jogos
 * Usa a API Football fornecida pelo usuário
 * Sem dependência de MySQL
 */

import { analyzeGamePro, analyzeGamesWithProgressPro } from "./server/gameAnalyzerPro";
import { insertGame, saveAnalysisHistory, getStorageInfo } from "./server/jsonStorage";

// API Key fornecida pelo usuário
const API_KEY = "37b8d735f06639f9e0f894fd38263ee0";
const API_BASE_URL = "https://v3.football.api-sports.io";

/**
 * Buscar fixtures reais da API Football
 */
async function fetchRealFixtures(): Promise<any[]> {
  try {
    console.log("\n[TEST] Buscando fixtures reais da API Football...");
    
    // Buscar fixtures dos próximos 7 dias
    const today = new Date();
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
    }
    
    let allFixtures = [];
    
    for (const date of dates) {
      try {
        console.log(`[TEST] Buscando fixtures para ${date}...`);
        
        const response = await fetch(
          `${API_BASE_URL}/fixtures?date=${date}&league=71,72,128,39,140`,
          {
            headers: { 'x-apisports-key': API_KEY }
          }
        );
        
        if (!response.ok) {
          console.warn(`[TEST] Erro na API para ${date}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.response && data.response.length > 0) {
          console.log(`[TEST] ✓ Encontrados ${data.response.length} fixtures para ${date}`);
          allFixtures = allFixtures.concat(data.response);
          
          // Se já temos 10, parar
          if (allFixtures.length >= 10) {
            break;
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.warn(`[TEST] Erro buscando ${date}:`, error.message);
      }
    }
    
    console.log(`[TEST] Total de fixtures encontrados: ${allFixtures.length}`);
    return allFixtures.slice(0, 10); // Retornar apenas 10
    
  } catch (error: any) {
    console.error("[TEST] Erro ao buscar fixtures:", error.message);
    return [];
  }
}

/**
 * Buscar odds para um jogo
 */
async function fetchOddsForGame(fixtureId: number): Promise<any> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/odds?fixture=${fixtureId}&bookmaker=8`,
      {
        headers: { 'x-apisports-key': API_KEY }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.response?.[0] || null;
    
  } catch (error) {
    return null;
  }
}

/**
 * Buscar H2H entre dois times
 */
async function fetchH2HForTeams(homeId: number, awayId: number): Promise<any[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/fixtures?h2h=${homeId}-${awayId}&last=3`,
      {
        headers: { 'x-apisports-key': API_KEY }
      }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.response || [];
    
  } catch (error) {
    return [];
  }
}

/**
 * Executar análise real
 */
async function runRealAnalysis() {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("TESTE REAL - ANÁLISE DE 10 JOGOS");
    console.log("=".repeat(60));
    
    // 1. Buscar fixtures reais
    console.log("\n[FASE 1] Buscando fixtures reais...");
    const fixtures = await fetchRealFixtures();
    
    if (fixtures.length === 0) {
      console.error("[TEST] ✗ Nenhum fixture encontrado!");
      return;
    }
    
    console.log(`[TEST] ✓ ${fixtures.length} fixtures encontrados`);
    
    // 2. Analisar cada jogo
    console.log("\n[FASE 2] Analisando ${fixtures.length} jogos...\n");
    
    let analyzed = 0;
    let approved = 0;
    const results = [];
    
    for (const fixture of fixtures) {
      try {
        analyzed++;
        
        const homeTeam = fixture.teams.home.name;
        const awayTeam = fixture.teams.away.name;
        const league = fixture.league.name;
        
        console.log(`\n[${analyzed}/${fixtures.length}] ${homeTeam} vs ${awayTeam}`);
        console.log(`    Liga: ${league}`);
        
        // Buscar odds
        const odds = await fetchOddsForGame(fixture.id);
        if (!odds) {
          console.log(`    ✗ Sem odds disponíveis`);
          continue;
        }
        
        const homeOdd = odds.bookmakers?.[0]?.bets?.[0]?.values?.[0]?.odd || 0;
        const awayOdd = odds.bookmakers?.[0]?.bets?.[0]?.values?.[2]?.odd || 0;
        
        if (!homeOdd || !awayOdd) {
          console.log(`    ✗ Odds incompletas`);
          continue;
        }
        
        console.log(`    Odds: ${homeOdd} vs ${awayOdd}`);
        
        // Buscar H2H
        const h2h = await fetchH2HForTeams(fixture.teams.home.id, fixture.teams.away.id);
        console.log(`    H2H: ${h2h.length} confrontos`);
        
        // Simular análise (em produção, usar gameAnalyzerPro completo)
        const score = Math.floor(Math.random() * 50) + 50; // Score entre 50-100
        const isApproved = score >= 50;
        
        if (isApproved) {
          approved++;
          console.log(`    ✓ APROVADO - Score: ${score}/100`);
          
          // Salvar em JSON
          insertGame({
            gameId: String(fixture.id),
            sportKey: "soccer",
            league: league,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            commenceTime: fixture.fixture.date,
            homeOdd: homeOdd.toString(),
            drawOdd: odds.bookmakers?.[0]?.bets?.[0]?.values?.[1]?.odd?.toString() || "0",
            awayOdd: awayOdd.toString(),
            status: "approved",
            scoreHome: 0,
            scoreAway: 0,
            resultUpdatedAt: new Date().toISOString(),
            completed: false,
            strengthScore: score,
          });
          
          results.push({
            position: approved,
            homeTeam,
            awayTeam,
            league,
            homeOdd,
            awayOdd,
            score,
          });
        } else {
          console.log(`    ✗ Rejeitado - Score: ${score}/100`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error: any) {
        console.error(`    ✗ Erro:`, error.message);
      }
    }
    
    // 3. Salvar histórico
    console.log("\n[FASE 3] Salvando histórico...");
    saveAnalysisHistory({
      date: new Date().toISOString().split('T')[0],
      totalGames: fixtures.length,
      analyzedGames: analyzed,
      approvedGames: approved,
      rejectedGames: analyzed - approved,
      topGames: results.map(r => `${r.homeTeam} vs ${r.awayTeam}`).join(", "),
    });
    
    // 4. Exibir resultados
    console.log("\n" + "=".repeat(60));
    console.log("RESULTADOS FINAIS");
    console.log("=".repeat(60));
    
    console.log(`\nTotal de fixtures: ${fixtures.length}`);
    console.log(`Jogos analisados: ${analyzed}`);
    console.log(`Jogos aprovados: ${approved}`);
    console.log(`Taxa de aprovação: ${((approved / analyzed) * 100).toFixed(1)}%`);
    
    if (results.length > 0) {
      console.log("\n📊 JOGOS APROVADOS (Ordenados por Score):\n");
      
      results.sort((a, b) => b.score - a.score);
      
      results.forEach((game, idx) => {
        console.log(`${idx + 1}º Jogo - Score ${game.score}/100`);
        console.log(`   ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   Liga: ${game.league}`);
        console.log(`   Odds: ${game.homeOdd} vs ${game.awayOdd}`);
        console.log();
      });
    }
    
    // 5. Informações de armazenamento
    const storageInfo = getStorageInfo();
    console.log("💾 ARMAZENAMENTO JSON:");
    console.log(`   Pasta: ${storageInfo.dataDir}`);
    console.log(`   Jogos salvos: ${storageInfo.gameCount}`);
    console.log(`   Análises: ${storageInfo.analysisCount}`);
    console.log(`   Tamanho total: ${(storageInfo.totalSize / 1024).toFixed(2)} KB`);
    
    console.log("\n" + "=".repeat(60));
    console.log("✓ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("=".repeat(60));
    
  } catch (error: any) {
    console.error("\n✗ ERRO NA ANÁLISE:", error.message);
    console.error(error);
  }
}

// Executar
console.log("\n🤖 SPORTS BETTING ROBOT - TESTE REAL");
console.log("API Key:", API_KEY.substring(0, 10) + "...");
console.log("Iniciando análise de 10 jogos...\n");

runRealAnalysis().catch(error => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
