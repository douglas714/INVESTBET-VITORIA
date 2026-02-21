/**
 * Script de Teste Demo - Análise de 10 Jogos Simulados
 * Demonstra o funcionamento completo do robô
 * Sem dependência de API (dados simulados)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório de dados
const DATA_DIR = path.join(__dirname, "data");

// Criar diretório se não existir
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`✓ Pasta criada: ${DATA_DIR}`);
  }
}

// Salvar dados em JSON
function saveJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Salvo: ${filePath}`);
}

// Ler dados JSON
function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Dados de teste simulados (10 jogos reais de ligas principais)
const DEMO_FIXTURES = [
  { id: 1, home: "Flamengo", away: "Vasco", league: "Campeonato Brasileiro", homeId: 1, awayId: 2 },
  { id: 2, home: "Palmeiras", away: "Corinthians", league: "Campeonato Brasileiro", homeId: 3, awayId: 4 },
  { id: 3, home: "São Paulo", away: "Santos", league: "Campeonato Brasileiro", homeId: 5, awayId: 6 },
  { id: 4, home: "Manchester United", away: "Liverpool", league: "Premier League", homeId: 7, awayId: 8 },
  { id: 5, home: "Arsenal", away: "Chelsea", league: "Premier League", homeId: 9, awayId: 10 },
  { id: 6, home: "Real Madrid", away: "Barcelona", league: "La Liga", homeId: 11, awayId: 12 },
  { id: 7, home: "Juventus", away: "AC Milan", league: "Serie A", homeId: 13, awayId: 14 },
  { id: 8, home: "PSG", away: "Marseille", league: "Ligue 1", homeId: 15, awayId: 16 },
  { id: 9, home: "Bayern Munich", away: "Borussia Dortmund", league: "Bundesliga", homeId: 17, awayId: 18 },
  { id: 10, home: "Ajax", away: "PSV Eindhoven", league: "Eredivisie", homeId: 19, awayId: 20 },
];

// Executar análise demo
async function runDemoAnalysis() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🤖 TESTE DEMO - ANÁLISE DE 10 JOGOS SIMULADOS");
    console.log("=".repeat(70));

    console.log(`\nData/Hora: ${new Date().toLocaleString()}`);
    console.log(`Modo: DEMONSTRAÇÃO (dados simulados)`);

    // Criar diretório
    ensureDataDir();

    console.log(`\n[FASE 1] Preparando 10 jogos de teste...`);
    console.log(`✓ ${DEMO_FIXTURES.length} fixtures prontos para análise`);

    // 2. Analisar cada jogo
    console.log("\n[FASE 2] Analisando jogos...\n");

    let analyzed = 0;
    let approved = 0;
    const results = [];
    const allGames = readJSON("games.json");

    for (const fixture of DEMO_FIXTURES) {
      try {
        analyzed++;

        const homeTeam = fixture.home;
        const awayTeam = fixture.away;
        const league = fixture.league;

        process.stdout.write(`[${analyzed}/${DEMO_FIXTURES.length}] ${homeTeam} vs ${awayTeam}... `);

        // Simular odds (valores realistas)
        const homeOdd = 1.5 + Math.random() * 1.5; // 1.5 a 3.0
        const awayOdd = 2.0 + Math.random() * 2.0; // 2.0 a 4.0
        const drawOdd = 3.0 + Math.random() * 1.0; // 3.0 a 4.0

        // Calcular score (simulado)
        const criteria = {
          oddsQuality: Math.random() > 0.3,
          recentForm: Math.random() > 0.3,
          h2hFavorable: Math.random() > 0.3,
          statisticsStrong: Math.random() > 0.3,
          valueBetting: Math.random() > 0.3,
        };

        const criteriaCount = Object.values(criteria).filter((v) => v).length;
        const score = 40 + criteriaCount * 12; // Score entre 40-100
        const isApproved = criteriaCount >= 3 && score >= 50;

        if (isApproved) {
          approved++;
          console.log(`✓ APROVADO (${score}/100)`);

          // Salvar em JSON
          const game = {
            id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            gameId: String(fixture.id),
            sportKey: "soccer",
            league: league,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            commenceTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            homeOdd: homeOdd.toFixed(2),
            drawOdd: drawOdd.toFixed(2),
            awayOdd: awayOdd.toFixed(2),
            status: "approved",
            scoreHome: 0,
            scoreAway: 0,
            analyzedAt: new Date().toISOString(),
            resultUpdatedAt: new Date().toISOString(),
            completed: false,
            strengthScore: score,
            criteria: criteria,
          };

          allGames.push(game);

          results.push({
            position: approved,
            homeTeam,
            awayTeam,
            league,
            homeOdd: homeOdd.toFixed(2),
            awayOdd: awayOdd.toFixed(2),
            score,
            criteria,
          });
        } else {
          console.log(`✗ Rejeitado (${score}/100, ${criteriaCount}/5 critérios)`);
        }

        // Simular delay
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`✗ Erro: ${error.message}`);
      }
    }

    // Salvar jogos
    saveJSON("games.json", allGames);

    // 3. Salvar histórico
    console.log("\n[FASE 3] Salvando histórico...");
    const history = readJSON("analysis_history.json");
    history.push({
      id: `analysis_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      totalGames: DEMO_FIXTURES.length,
      analyzedGames: analyzed,
      approvedGames: approved,
      rejectedGames: analyzed - approved,
      topGames: results.map((r) => `${r.homeTeam} vs ${r.awayTeam}`).join(", "),
      createdAt: new Date().toISOString(),
    });
    saveJSON("analysis_history.json", history);

    // 4. Salvar estatísticas
    console.log("[FASE 4] Salvando estatísticas...");
    const statistics = readJSON("statistics.json");
    statistics.push({
      id: `stats_${new Date().toISOString().split("T")[0]}`,
      date: new Date().toISOString().split("T")[0],
      totalAnalyzed: analyzed,
      totalApproved: approved,
      totalRejected: analyzed - approved,
      approvalRate: ((approved / analyzed) * 100).toFixed(1),
      averageScore: (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1),
      updatedAt: new Date().toISOString(),
    });
    saveJSON("statistics.json", statistics);

    // 5. Exibir resultados
    console.log("\n" + "=".repeat(70));
    console.log("📊 RESULTADOS FINAIS");
    console.log("=".repeat(70));

    console.log(`\nTotal de fixtures: ${DEMO_FIXTURES.length}`);
    console.log(`Jogos analisados: ${analyzed}`);
    console.log(`Jogos aprovados: ${approved}`);
    console.log(`Taxa de aprovação: ${((approved / analyzed) * 100).toFixed(1)}%`);

    if (results.length > 0) {
      console.log("\n🏆 JOGOS APROVADOS (Ordenados por Score):\n");

      results.sort((a, b) => b.score - a.score);

      results.forEach((game, idx) => {
        console.log(`${idx + 1}º Jogo - Score ${game.score}/100`);
        console.log(`   ${game.homeTeam} vs ${game.awayTeam}`);
        console.log(`   Liga: ${game.league}`);
        console.log(`   Odds: ${game.homeOdd} vs ${game.awayOdd}`);
        console.log(`   Critérios atendidos:`);
        Object.entries(game.criteria).forEach(([key, value]) => {
          console.log(`     - ${key}: ${value ? "✓" : "✗"}`);
        });
        console.log();
      });
    }

    // 6. Informações de armazenamento
    console.log("💾 ARMAZENAMENTO JSON:");
    console.log(`   Pasta: ${DATA_DIR}`);
    console.log(`   Jogos salvos: ${allGames.length}`);
    console.log(`   Análises: ${history.length}`);
    console.log(`   Estatísticas: ${statistics.length}`);

    try {
      const gamesSize = fs.statSync(path.join(DATA_DIR, "games.json")).size;
      const historySize = fs.statSync(path.join(DATA_DIR, "analysis_history.json")).size;
      const statsSize = fs.statSync(path.join(DATA_DIR, "statistics.json")).size;
      console.log(`   Tamanho total: ${((gamesSize + historySize + statsSize) / 1024).toFixed(2)} KB`);
    } catch (e) {
      // Ignorar erro de tamanho
    }

    console.log("\n" + "=".repeat(70));
    console.log("✓ TESTE CONCLUÍDO COM SUCESSO!");
    console.log("=".repeat(70));
    console.log("\nArquivos criados:");
    console.log("1. data/games.json - Todos os jogos analisados");
    console.log("2. data/analysis_history.json - Histórico de análises");
    console.log("3. data/statistics.json - Estatísticas");
    console.log("\nPróximos passos:");
    console.log("1. Abrir: data/games.json");
    console.log("2. Ver todos os jogos analisados e aprovados");
    console.log("3. Usar dados para apostas");
    console.log("4. Rodar 'pnpm dev' para usar com API real");
  } catch (error) {
    console.error("\n✗ ERRO NA ANÁLISE:", error.message);
    console.error(error);
  }
}

// Executar
console.log("\n🚀 SPORTS BETTING ROBOT - TESTE DEMO COM 10 JOGOS");
console.log("Iniciando análise simulada...");

runDemoAnalysis().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
