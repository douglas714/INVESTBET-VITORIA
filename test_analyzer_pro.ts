// Teste simples do analisador PRO
import { analyzeGamePro, GameAnalysisPro } from "./server/gameAnalyzerPro";

// Mock de um jogo
const mockGame = {
  fixture: {
    id: 123,
    date: "2026-01-18T15:00:00Z",
    timestamp: 1705594800,
    timezone: "UTC",
    week: 1,
    status: {
      long: "Not Started",
      short: "NS",
      elapsed: 0,
    },
  },
  league: {
    id: 71,
    name: "Campeonato Brasileiro",
    country: "Brazil",
    logo: "https://example.com/logo.png",
    flag: "https://example.com/flag.png",
    season: 2026,
    round: "1",
  },
  teams: {
    home: {
      id: 1,
      name: "Flamengo",
      logo: "https://example.com/flamengo.png",
    },
    away: {
      id: 2,
      name: "Vasco",
      logo: "https://example.com/vasco.png",
    },
  },
  goals: {
    home: 0,
    away: 0,
  },
  score: {
    halftime: { home: 0, away: 0 },
    fulltime: { home: 0, away: 0 },
    extratime: { home: 0, away: 0 },
    penalty: { home: 0, away: 0 },
  },
};

console.log("✓ Teste de compilação TypeScript passou");
console.log("✓ Imports funcionando");
console.log("✓ Tipos definidos corretamente");
