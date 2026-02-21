import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const OUT_DIR = path.join(__dirname, "out");
const RAW = path.join(OUT_DIR, "backtest_raw.json");
const REPORT_MD = path.join(OUT_DIR, "backtest_report.md");
const SUMMARY_CSV = path.join(OUT_DIR, "backtest_summary.csv");

type Row = {
  date: string;
  fixtureId: number;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeOdd?: number;
  drawOdd?: number;
  awayOdd?: number;
  result: { status: string; goalsHome: number; goalsAway: number };
  h2hCount: number;
};

function bucketOdd(o?: number): string {
  if (!o) return "sem_odd";
  if (o < 1.30) return "<1.30";
  if (o < 1.40) return "1.30-1.39";
  if (o < 1.55) return "1.40-1.54";
  if (o < 1.75) return "1.55-1.74";
  if (o < 2.00) return "1.75-1.99";
  return ">=2.00";
}

function main() {
  if (!existsSync(RAW)) {
    console.error("Arquivo backtest_raw.json não encontrado. Rode: pnpm backtest:last30");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(RAW, "utf-8"));
  const rows: Row[] = raw.rows ?? [];

  // Métrica de alta assertividade: "mandante não perde" (1X) e "vitória mandante"
  const stats: Record<string, { total: number; win: number; notLose: number }> = {};

  for (const r of rows) {
    const b = bucketOdd(r.homeOdd);
    if (!stats[b]) stats[b] = { total: 0, win: 0, notLose: 0 };
    stats[b].total++;

    const winHome = r.result.goalsHome > r.result.goalsAway;
    const notLoseHome = r.result.goalsHome >= r.result.goalsAway;

    if (winHome) stats[b].win++;
    if (notLoseHome) stats[b].notLose++;
  }

  // CSV
  const csvLines = ["odd_bucket,total,win_home,win_home_rate,not_lose_home,not_lose_rate"];
  for (const [b, s] of Object.entries(stats)) {
    const winRate = s.total ? (s.win / s.total) : 0;
    const notLoseRate = s.total ? (s.notLose / s.total) : 0;
    csvLines.push([b, s.total, s.win, winRate.toFixed(4), s.notLose, notLoseRate.toFixed(4)].join(","));
  }
  writeFileSync(SUMMARY_CSV, csvLines.join("\n"), "utf-8");

  // Markdown
  const lines: string[] = [];
  lines.push(`# Backtest (últimos ${raw.days} dias)`);
  lines.push(`Gerado em: ${raw.generatedAt}`);
  lines.push("");
  lines.push("## Resumo por faixa de odd (mandante)");
  lines.push("");
  lines.push("| Faixa | Jogos | Vitória mandante | % | Mandante não perde (1X) | % |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const [b, s] of Object.entries(stats)) {
    const winRate = s.total ? (100 * s.win / s.total) : 0;
    const notLoseRate = s.total ? (100 * s.notLose / s.total) : 0;
    lines.push(`| ${b} | ${s.total} | ${s.win} | ${winRate.toFixed(1)}% | ${s.notLose} | ${notLoseRate.toFixed(1)}% |`);
  }
  lines.push("");
  lines.push("## Como usar este relatório");
  lines.push("- Se seu alvo é **90%**, foque no indicador **Mandante não perde (1X)**.");
  lines.push("- Ajuste o robô para priorizar faixas onde a taxa de **1X** é maior.");
  lines.push("- Combine isso com seus critérios fortes (favorito forte + H2H forte + baixa rotação).");
  lines.push("");

  writeFileSync(REPORT_MD, lines.join("\n"), "utf-8");
  console.log(`[Report] Wrote ${REPORT_MD} and ${SUMMARY_CSV}`);
}

main();
