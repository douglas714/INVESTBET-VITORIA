/**
 * Script de Análise REAL - 10 Jogos
 * Dispara requisições REAIS na API Football
 * Mostra consumo de requisições
 */

const API_KEY = "37b8d735f06639f9e0f894fd38263ee0";
const API_BASE_URL = "https://v3.football.api-sports.io";

let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;

// Função para fazer requisição e contar
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
      failedRequests++;
      return null;
    }

    // Extrair rate limit
    const rateLimitUsed = data.paging?.current || 0;
    const rateLimitTotal = data.paging?.total || "?";
    
    console.log(`   ✓ Sucesso`);
    console.log(`   Rate Limit: ${data.results || 0} resultados`);
    
    successfulRequests++;
    
    // Aguardar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return data;

  } catch (error) {
    console.log(`   ✗ ERRO: ${error.message}`);
    failedRequests++;
    return null;
  }
}

// Executar análise
async function runAnalysis() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🤖 ANÁLISE REAL - 10 REQUISIÇÕES NA API FOOTBALL");
    console.log("=".repeat(70));

    console.log(`\nAPI Key: ${API_KEY.substring(0, 10)}...`);
    console.log(`Data/Hora: ${new Date().toLocaleString()}`);
    console.log(`Objetivo: Disparar 10 requisições REAIS e analisar 10 jogos`);

    // 1. Verificar status da API
    console.log("\n" + "-".repeat(70));
    console.log("FASE 1: Verificar Status da API");
    console.log("-".repeat(70));

    const status = await makeRequest("/status", "Verificar status da API");
    if (!status) {
      console.error("\n✗ Falha ao conectar com API");
      return;
    }

    // 2. Buscar fixtures dos próximos dias
    console.log("\n" + "-".repeat(70));
    console.log("FASE 2: Buscar Fixtures (Próximos 7 dias)");
    console.log("-".repeat(70));

    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      dates.push(dateStr);
    }

    let allFixtures = [];
    
    for (const date of dates) {
      const fixtures = await makeRequest(
        `/fixtures?date=${date}&league=71,72,128,39,140`,
        `Buscar fixtures para ${date}`
      );
      
      if (fixtures && fixtures.response && fixtures.response.length > 0) {
        console.log(`   Encontrados: ${fixtures.response.length} fixtures`);
        allFixtures = allFixtures.concat(fixtures.response);
        
        if (allFixtures.length >= 10) {
          break;
        }
      }
    }

    console.log(`\n✓ Total de fixtures encontrados: ${allFixtures.length}`);

    if (allFixtures.length === 0) {
      console.log("\n✗ Nenhum fixture encontrado para análise");
      console.log("Motivo: Sem jogos agendados para as próximas datas");
      return;
    }

    // 3. Buscar odds para cada jogo
    console.log("\n" + "-".repeat(70));
    console.log("FASE 3: Buscar Odds (Próximos 10 Jogos)");
    console.log("-".repeat(70));

    const gamesWithOdds = [];
    
    for (let i = 0; i < Math.min(10, allFixtures.length); i++) {
      const fixture = allFixtures[i];
      const odds = await makeRequest(
        `/odds?fixture=${fixture.id}&bookmaker=8`,
        `Buscar odds para ${fixture.teams.home.name} vs ${fixture.teams.away.name}`
      );
      
      if (odds && odds.response && odds.response.length > 0) {
        gamesWithOdds.push({
          fixture: fixture,
          odds: odds.response[0],
        });
      }
    }

    console.log(`\n✓ Jogos com odds encontrados: ${gamesWithOdds.length}`);

    // 4. Buscar H2H para cada jogo
    console.log("\n" + "-".repeat(70));
    console.log("FASE 4: Buscar H2H (Histórico de Confrontos)");
    console.log("-".repeat(70));

    const gamesWithH2H = [];
    
    for (const game of gamesWithOdds.slice(0, 5)) {
      const h2h = await makeRequest(
        `/fixtures?h2h=${game.fixture.teams.home.id}-${game.fixture.teams.away.id}&last=3`,
        `H2H: ${game.fixture.teams.home.name} vs ${game.fixture.teams.away.name}`
      );
      
      gamesWithH2H.push({
        ...game,
        h2h: h2h?.response || [],
      });
    }

    console.log(`\n✓ Jogos com H2H analisados: ${gamesWithH2H.length}`);

    // 5. Resumo final
    console.log("\n" + "=".repeat(70));
    console.log("📊 RESUMO FINAL");
    console.log("=".repeat(70));

    console.log(`\nRequisições Disparadas:`);
    console.log(`  Total: ${totalRequests}`);
    console.log(`  Sucesso: ${successfulRequests} ✓`);
    console.log(`  Falha: ${failedRequests} ✗`);
    console.log(`  Taxa de Sucesso: ${((successfulRequests / totalRequests) * 100).toFixed(1)}%`);

    console.log(`\nDados Coletados:`);
    console.log(`  Fixtures encontrados: ${allFixtures.length}`);
    console.log(`  Jogos com odds: ${gamesWithOdds.length}`);
    console.log(`  Jogos com H2H: ${gamesWithH2H.length}`);

    if (gamesWithH2H.length > 0) {
      console.log(`\n🏆 Jogos Analisados:\n`);
      
      gamesWithH2H.forEach((game, idx) => {
        const homeTeam = game.fixture.teams.home.name;
        const awayTeam = game.fixture.teams.away.name;
        const league = game.fixture.league.name;
        const homeOdd = game.odds.bookmakers?.[0]?.bets?.[0]?.values?.[0]?.odd || "N/A";
        const awayOdd = game.odds.bookmakers?.[0]?.bets?.[0]?.values?.[2]?.odd || "N/A";
        
        console.log(`${idx + 1}. ${homeTeam} vs ${awayTeam}`);
        console.log(`   Liga: ${league}`);
        console.log(`   Odds: ${homeOdd} vs ${awayOdd}`);
        console.log(`   H2H: ${game.h2h.length} confrontos`);
        console.log();
      });
    }

    console.log("=".repeat(70));
    console.log("✓ ANÁLISE CONCLUÍDA!");
    console.log("=".repeat(70));
    
    console.log(`\n📌 Próximas Ações:`);
    console.log(`1. Verificar consumo de requisições em: https://dashboard.api-football.com`);
    console.log(`2. Confirmar ${totalRequests} requisições foram disparadas`);
    console.log(`3. Usar dados coletados para análise de apostas`);

  } catch (error) {
    console.error("\n✗ ERRO NA ANÁLISE:", error.message);
    console.error(error);
  }
}

// Executar
console.log("\n🚀 SPORTS BETTING ROBOT - ANÁLISE REAL COM API FOOTBALL");
console.log("Iniciando análise com requisições REAIS...\n");

runAnalysis().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
