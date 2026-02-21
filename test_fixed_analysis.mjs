/**
 * Teste da Análise CORRIGIDA - Nova API Key
 * Dispara requisições REAIS com scoring realista
 */

const API_KEY = "e8eff8b8790784203d03eb46da8a22a1";
const API_BASE_URL = "https://v3.football.api-sports.io";

let totalRequests = 0;
let successfulRequests = 0;
const requestLog = [];

// Função para fazer requisição
async function makeRequest(endpoint, description) {
  try {
    totalRequests++;
    console.log(`\n[REQ ${totalRequests}] ${description}`);
    console.log(`   Endpoint: ${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { "x-apisports-key": API_KEY },
    });

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.log(`   ✗ ERRO: ${JSON.stringify(data.errors)}`);
      requestLog.push({
        number: totalRequests,
        endpoint: endpoint,
        description: description,
        status: "✗ Erro",
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    console.log(`   ✓ Sucesso (200 OK)`);
    console.log(`   Resultados: ${data.results || 0}`);
    console.log(`   Requisições consumidas: ${totalRequests}/100`);
    
    successfulRequests++;
    requestLog.push({
      number: totalRequests,
      endpoint: endpoint,
      description: description,
      status: "✓ Sucesso",
      timestamp: new Date().toISOString(),
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return data;

  } catch (error) {
    console.log(`   ✗ ERRO: ${error.message}`);
    requestLog.push({
      number: totalRequests,
      endpoint: endpoint,
      description: description,
      status: `✗ ${error.message}`,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

// Calcular score realista
function calculateScore(homeOdd, awayOdd, h2hWins = 1, h2hTotal = 2) {
  let score = 0;

  // Critério 1: Odds Disponíveis (20 pontos)
  if (!homeOdd || !awayOdd) return 0;
  score += 20;

  // Critério 2: Home Favorito (0-20 pontos progressivos)
  if (homeOdd < 1.5) {
    score += 20;
  } else if (homeOdd < 1.8) {
    score += 18;
  } else if (homeOdd < 2.0) {
    score += 15;
  } else if (homeOdd < 2.5) {
    score += 10;
  } else {
    score += 5;
  }

  // Critério 3: Diferença de Odds (0-20 pontos)
  const oddsDiff = Math.abs(awayOdd - homeOdd);
  if (oddsDiff >= 2.0) {
    score += 20;
  } else if (oddsDiff >= 1.5) {
    score += 18;
  } else if (oddsDiff >= 1.0) {
    score += 15;
  } else if (oddsDiff >= 0.5) {
    score += 10;
  } else {
    score += 5;
  }

  // Critério 4: Histórico (0-20 pontos)
  const winRate = h2hWins / h2hTotal;
  if (winRate === 1.0) {
    score += 20;
  } else if (winRate >= 0.66) {
    score += 15;
  } else if (winRate > 0) {
    score += 10;
  } else {
    score += 3;
  }

  // Critério 5: Value Betting (0-20 pontos)
  const impliedProb = 1 / homeOdd;
  if (impliedProb < 0.5) {
    score += 20;
  } else if (impliedProb < 0.6) {
    score += 18;
  } else if (impliedProb < 0.7) {
    score += 15;
  } else {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

// Executar análise
async function runAnalysis() {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("🤖 ANÁLISE CORRIGIDA - NOVA API KEY");
    console.log("=".repeat(80));

    console.log(`\n📊 Informações:`);
    console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);
    console.log(`   Data/Hora: ${new Date().toLocaleString()}`);
    console.log(`   Objetivo: Disparar 10+ requisições com scoring REALISTA`);

    // FASE 1: Status
    console.log("\n" + "-".repeat(80));
    console.log("FASE 1: Verificar Status da API");
    console.log("-".repeat(80));

    const status = await makeRequest("/status", "Verificar status");
    
    if (!status) {
      console.error("\n✗ Falha ao conectar");
      return;
    }

    // FASE 2: Buscar Fixtures
    console.log("\n" + "-".repeat(80));
    console.log("FASE 2: Buscar Fixtures (3 requisições)");
    console.log("-".repeat(80));

    const fixtures1 = await makeRequest(
      "/fixtures?date=2026-01-18&league=71,72,128,39,140",
      "Buscar fixtures 2026-01-18"
    );

    const fixtures2 = await makeRequest(
      "/fixtures?date=2026-01-19&league=71,72,128,39,140",
      "Buscar fixtures 2026-01-19"
    );

    const fixtures3 = await makeRequest(
      "/fixtures?date=2026-01-20&league=71,72,128,39,140",
      "Buscar fixtures 2026-01-20"
    );

    let allFixtures = [];
    if (fixtures1?.response) allFixtures = allFixtures.concat(fixtures1.response);
    if (fixtures2?.response) allFixtures = allFixtures.concat(fixtures2.response);
    if (fixtures3?.response) allFixtures = allFixtures.concat(fixtures3.response);

    console.log(`\n✓ Total de fixtures: ${allFixtures.length}`);

    if (allFixtures.length === 0) {
      console.log("\n⚠️  Nenhum fixture encontrado, usando dados de teste...");
      
      allFixtures = [
        { id: 1234567, teams: { home: { name: "Flamengo", id: 1 }, away: { name: "Vasco", id: 2 } }, league: { name: "Campeonato Brasileiro" } },
        { id: 1234568, teams: { home: { name: "Palmeiras", id: 3 }, away: { name: "Corinthians", id: 4 } }, league: { name: "Campeonato Brasileiro" } },
        { id: 1234569, teams: { home: { name: "São Paulo", id: 5 }, away: { name: "Santos", id: 6 } }, league: { name: "Campeonato Brasileiro" } },
        { id: 1234570, teams: { home: { name: "Manchester United", id: 33 }, away: { name: "Liverpool", id: 14 } }, league: { name: "Premier League" } },
        { id: 1234571, teams: { home: { name: "Arsenal", id: 42 }, away: { name: "Chelsea", id: 49 } }, league: { name: "Premier League" } },
        { id: 1234572, teams: { home: { name: "Real Madrid", id: 541 }, away: { name: "Barcelona", id: 529 } }, league: { name: "La Liga" } },
        { id: 1234573, teams: { home: { name: "Juventus", id: 497 }, away: { name: "AC Milan", id: 489 } }, league: { name: "Serie A" } },
        { id: 1234574, teams: { home: { name: "PSG", id: 80 }, away: { name: "Marseille", id: 81 } }, league: { name: "Ligue 1" } },
        { id: 1234575, teams: { home: { name: "Bayern Munich", id: 25 }, away: { name: "Borussia Dortmund", id: 165 } }, league: { name: "Bundesliga" } },
        { id: 1234576, teams: { home: { name: "Ajax", id: 194 }, away: { name: "PSV Eindhoven", id: 228 } }, league: { name: "Eredivisie" } },
      ];
    }

    // FASE 3: Buscar Odds e Analisar
    console.log("\n" + "-".repeat(80));
    console.log("FASE 3: Buscar Odds e Analisar (10 requisições)");
    console.log("-".repeat(80));

    const games = [];
    
    for (let i = 0; i < Math.min(10, allFixtures.length); i++) {
      const fixture = allFixtures[i];
      const odds = await makeRequest(
        `/odds?fixture=${fixture.id}&bookmaker=8`,
        `Odds: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`
      );
      
      if (odds && odds.response && odds.response.length > 0) {
        const oddsData = odds.response[0];
        const bookmaker = oddsData.bookmakers?.[0];
        
        if (bookmaker && bookmaker.bets && bookmaker.bets.length > 0) {
          const bet = bookmaker.bets[0];
          const homeOdd = bet.values?.[0]?.odd;
          const awayOdd = bet.values?.[2]?.odd;
          
          if (homeOdd && awayOdd) {
            // Calcular score com novo algoritmo
            const score = calculateScore(homeOdd, awayOdd, 1, 2);
            
            games.push({
              position: games.length + 1,
              home: fixture.teams.home.name,
              away: fixture.teams.away.name,
              league: fixture.league.name,
              homeOdd: homeOdd.toFixed(2),
              awayOdd: awayOdd.toFixed(2),
              score: score,
              status: score >= 50 ? "✓ APROVADO" : "✗ Rejeitado",
            });
          }
        }
      }
    }

    // Ordenar por score
    games.sort((a, b) => b.score - a.score);

    // FASE 4: Resumo
    console.log("\n" + "=".repeat(80));
    console.log("📈 RESUMO FINAL");
    console.log("=".repeat(80));

    console.log(`\n✅ Requisições:`);
    console.log(`   Total: ${totalRequests}`);
    console.log(`   Sucesso: ${successfulRequests}`);
    console.log(`   Consumidas: ${totalRequests}/100`);
    console.log(`   Restantes: ${100 - totalRequests}/100`);

    const approved = games.filter(g => g.status.includes("APROVADO"));
    console.log(`\n📊 Análise:`);
    console.log(`   Jogos Analisados: ${games.length}`);
    console.log(`   Jogos Aprovados: ${approved.length}`);
    console.log(`   Taxa de Aprovação: ${((approved.length / games.length) * 100).toFixed(1)}%`);

    if (games.length > 0) {
      console.log(`\n🏆 Jogos (Ordenados por Score):\n`);
      
      games.forEach((game) => {
        console.log(`${game.position}. ${game.home} vs ${game.away}`);
        console.log(`   Liga: ${game.league}`);
        console.log(`   Odds: ${game.homeOdd} vs ${game.awayOdd}`);
        console.log(`   Score: ${game.score}/100`);
        console.log(`   Status: ${game.status}`);
        console.log();
      });
    }

    console.log("=".repeat(80));
    console.log("✓ ANÁLISE CONCLUÍDA COM SUCESSO!");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n✗ ERRO:", error.message);
  }
}

// Executar
console.log("\n🚀 TESTE DE ANÁLISE CORRIGIDA");
console.log("Disparando requisições REAIS com scoring realista...\n");

runAnalysis().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
