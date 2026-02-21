import { fetchFixturesByDate, fetchDetailedOdds, extractBestOdds, fetchH2H, fetchFixtureResult, setDynamicApiKey } from "../apiFootballService";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

// Backtest dos últimos 30 dias (alta assertividade)
// Saída: server/tools/out/backtest_raw.json

const DAYS = Number(process.env.BACKTEST_DAYS ?? 30);
const OUT_DIR = path.join(__dirname, "out");
const OUT_FILE = path.join(OUT_DIR, "backtest_raw.json");

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const apiKey = process.env.API_FOOTBALL_KEY_DYNAMIC || process.env.API_FOOTBALL_KEY || process.env.API_FOOTBALL_KEY_2;
  if (apiKey) setDynamicApiKey(apiKey);

  const today = new Date();
  const rows: any[] = [];

  for (let i = 1; i <= DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = toDateStr(d);

    console.log(`[Backtest] Fetching fixtures for ${dateStr}...`);
    const fixtures = await fetchFixturesByDate(dateStr);

    for (const fx of fixtures) {
      const fixtureId = fx.fixture?.id;
      if (!fixtureId) continue;

      // Resultado final
      const res = await fetchFixtureResult(fixtureId);
      const status = res?.fixture?.status?.short;
      const goalsHome = res?.goals?.home;
      const goalsAway = res?.goals?.away;

      if (!status || (status !== "FT" && status !== "AET" && status !== "PEN")) continue;
      if (typeof goalsHome !== "number" || typeof goalsAway !== "number") continue;

      // Odds (se disponíveis no histórico)
      let homeOdd: number | undefined;
      let drawOdd: number | undefined;
      let awayOdd: number | undefined;
      try {
        const odds = await fetchDetailedOdds(fixtureId);
        const best = extractBestOdds(odds);
        if (best) {
          homeOdd = best.homeOdd;
          drawOdd = best.drawOdd;
          awayOdd = best.awayOdd;
        }
      } catch {}

      // H2H (para features futuras no relatório)
      let h2h: any[] = [];
      try {
        h2h = await fetchH2H(fx.teams.home.id, fx.teams.away.id);
      } catch {}

      rows.push({
        date: dateStr,
        fixtureId,
        league: fx.league?.name,
        homeTeam: fx.teams?.home?.name,
        awayTeam: fx.teams?.away?.name,
        homeOdd,
        drawOdd,
        awayOdd,
        result: { status, goalsHome, goalsAway },
        h2hCount: Array.isArray(h2h) ? h2h.length : 0
      });
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), days: DAYS, rows }, null, 2), "utf-8");
  console.log(`[Backtest] Wrote ${rows.length} rows to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error("[Backtest] ERROR", e);
  process.exit(1);
});
