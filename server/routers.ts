
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { 
  fetchFixturesByDate, 
  getStatus, 
  setDynamicApiKey,
  fetchStandings,
  fetchTeamStats,
  fetchDetailedOdds,
  fetchOddsByDate,
  extractBookmakers,
  extractBestOdds,
  extractConsensusOdds,
  fetchPredictions,
  fetchH2H,
  fetchUpcomingFixtures,
  fetchFixtureResult
} from "./apiFootballService";
import {
  insertGame,
  getTodaysGames,
  saveAnalysisHistory,
  getAnalysisHistory,
  getAnalysisHistoryByDate,
  getAllGames,
  updateGameResult,
  clearAllData,
  getSettings,
  saveSettings,
  GameRecord,
} from "./jsonStorage";
import { TelegramService } from "./telegramService";
import { startTelegramFinalWatcher, stopTelegramFinalWatcher } from "./telegramFinalWatcher";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { analyzeGamesFor2GoalMargin, getAnalysisReport } from "./gameAnalyzer2GoalMargin";
import { cacheService } from "./cacheService";
import { metricsService, type AnalysisMetrics } from "./metricsService";

// Alta assertividade: filtrar picks com odd mínima (mercado base)
const MIN_RECOMMENDED_ODD = Number(process.env.MIN_RECOMMENDED_ODD ?? 1.30);

const COOKIE_NAME = "session";

// Lista de casas de apostas conhecidas (fallback)
const KNOWN_BOOKMAKERS = [
  "Bet365",
  "Betano",
  "Sportingbet",
  "Betfair",
  "1xBet",
  "Pinnacle",
  "Unibet",
  "William Hill",
  "Bwin",
  "888sport"
];

// Calcular score realista

// Modo "Home Win" robusto (menos dependente de odds)
const HOME_ONLY_FOCUS = String(process.env.HOME_ONLY_FOCUS ?? "1") === "1";
const ODDS_AS_SIGNAL = String(process.env.ODDS_AS_SIGNAL ?? "0") === "1"; // por padrão: NÃO usar odds como base
const MIN_HOME_WIN_PROB = Number(process.env.MIN_HOME_WIN_PROB ?? 0.72); // corte para aprovar (robusto)
const MIN_TOP1_HOME_WIN_PROB = Number(process.env.MIN_TOP1_HOME_WIN_PROB ?? 0.80); // corte para o TOP 1

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function extractAvgGoals(teamStats: any, side: "home" | "away") {
  // API-Football: response.goals.for.average.home / away etc.
  const gf = safeNum(teamStats?.goals?.for?.average?.[side]);
  const ga = safeNum(teamStats?.goals?.against?.average?.[side]);
  return { gf, ga };
}

function calcHomeWinProbFromSignals(opts: {
  predHomePct?: number;
  standingsGap?: number;
  formDelta?: number;
  injuriesHome?: number;
  injuriesAway?: number;
  goalsHome?: { gf: number; ga: number };
  goalsAway?: { gf: number; ga: number };
  bookmakersCount?: number;
}): { p: number; confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  let confidence = 1.0;

  // Base prob neutra (sem odds). Vai sendo empurrada pelos sinais.
  let p = 0.55;

  // Cobertura de mercado (liquidez) melhora confiabilidade, não “chance”.
  const bm = opts.bookmakersCount ?? 0;
  if (bm >= 10) { confidence *= 1.02; reasons.push("Liquidez alta (10+ casas)"); }
  else if (bm >= 6) { confidence *= 1.00; reasons.push("Liquidez ok (6+ casas)"); }
  else { confidence *= 0.92; reasons.push("Liquidez baixa (<6 casas)"); }

  // Predictions (API): sinal forte, mas não absoluto
  const pred = opts.predHomePct;
  if (typeof pred === "number" && Number.isFinite(pred)) {
    if (pred >= 80) { p += 0.12; reasons.push("Predição API muito forte (>=80%)"); }
    else if (pred >= 75) { p += 0.09; reasons.push("Predição API forte (>=75%)"); }
    else if (pred >= 70) { p += 0.06; reasons.push("Predição API boa (>=70%)"); }
    else if (pred >= 65) { p += 0.03; reasons.push("Predição API moderada (>=65%)"); }
    else { p -= 0.06; reasons.push("Predição API fraca (<65%)"); }
  } else {
    confidence *= 0.93;
    reasons.push("Sem predição API (confiança reduzida)");
  }

  // Standings gap (awayPos - homePos). Positivo = mandante melhor.
  const gap = opts.standingsGap;
  if (typeof gap === "number" && Number.isFinite(gap)) {
    if (gap >= 12) { p += 0.07; reasons.push("Mandante muito acima na tabela (gap >=12)"); }
    else if (gap >= 8) { p += 0.05; reasons.push("Mandante acima na tabela (gap >=8)"); }
    else if (gap >= 5) { p += 0.03; reasons.push("Mandante levemente acima na tabela"); }
    else if (gap <= -5) { p -= 0.08; reasons.push("Visitante melhor na tabela (gap <= -5)"); }
  } else {
    confidence *= 0.95;
    reasons.push("Sem standings (confiança reduzida)");
  }

  // Forma (wins delta últimos N)
  const fd = opts.formDelta;
  if (typeof fd === "number" && Number.isFinite(fd)) {
    if (fd >= 3) { p += 0.05; reasons.push("Forma muito superior (ΔW>=3)"); }
    else if (fd >= 2) { p += 0.035; reasons.push("Forma superior (ΔW>=2)"); }
    else if (fd <= -2) { p -= 0.06; reasons.push("Forma pior (ΔW<=-2)"); }
  } else {
    confidence *= 0.96;
    reasons.push("Sem forma (confiança reduzida)");
  }

  // Gols médios (home em casa vs away fora) -> proxy de força real
  const gh = opts.goalsHome;
  const ga = opts.goalsAway;
  if (gh && ga) {
    // vantagem do mandante: ataque em casa - defesa fora + defesa em casa - ataque fora
    const attackEdge = (gh.gf - ga.ga);
    const defenseEdge = (ga.gf - gh.ga); // quanto o away costuma marcar vs quanto o home costuma sofrer
    const net = attackEdge - defenseEdge;
    if (net >= 1.0) { p += 0.06; reasons.push("Vantagem alta em gols médios (home/away)"); }
    else if (net >= 0.5) { p += 0.04; reasons.push("Vantagem moderada em gols médios (home/away)"); }
    else if (net <= -0.5) { p -= 0.06; reasons.push("Desvantagem em gols médios (home/away)"); }
  } else {
    confidence *= 0.95;
    reasons.push("Sem estatísticas de gols (confiança reduzida)");
  }

  // Lesões (injuries endpoint): usamos como fator de risco
  const ih = opts.injuriesHome;
  const ia = opts.injuriesAway;
  if (typeof ih === "number" && typeof ia === "number") {
    if (ih <= 1) { p += 0.02; reasons.push("Poucas lesões no mandante"); }
    else if (ih >= 4) { p -= 0.06; reasons.push("Muitas lesões no mandante"); confidence *= 0.92; }
    if (ia >= 4) { p += 0.03; reasons.push("Muitas lesões no visitante"); }
  } else {
    confidence *= 0.94;
    reasons.push("Sem injuries (confiança reduzida)");
  }

  // Cap de realismo (futebol não é 100%)
  p = clamp(p, 0.05, 0.90);
  confidence = clamp(confidence, 0.70, 1.05);
  // Probabilidade final "robusta" (reduz extremos)
  const pFinal = clamp(p * confidence, 0.05, 0.90);
  return { p: pFinal, confidence, reasons };
}

function calculateScore(
  homeOdd?: number,
  drawOdd?: number,
  awayOdd?: number,
  h2hStrongWins: number = 0,
  h2hConsidered: number = 0,
  opts?: {
    favoriteStrong?: boolean;
    bookmakersCount?: number;
    injuriesCount?: number;
    mainSquadLikely?: boolean;
    formGood?: boolean;
    has1x2Odds?: boolean;
    predHomePct?: number; // API-Football predictions (0..100)
    standingsGap?: number; // posição away - posição home (positivo = mandante melhor)
    formDelta?: number; // (wins_home - wins_away) nos últimos N
    overround?: number; // margem implícita do mercado 1X2 (ph+pd+pa)
    homeHomeWinPct?: number; // % vitórias do mandante em casa (0..1)
    awayAwayLossPct?: number; // % derrotas do visitante fora (0..1)
    h2hHomeWinsBasic?: number; // vitórias do mandante nos últimos H2H básicos
    h2hMatchesBasic?: number; // quantidade considerada no H2H básico
  }
): number {
  const bm = opts?.bookmakersCount ?? 0;
  const has1x2 = typeof opts?.has1x2Odds === "boolean"
    ? opts!.has1x2Odds!
    : (!!homeOdd && !!drawOdd && !!awayOdd);

  // Se não temos NENHUMA casa de aposta ligada, não dá para garantir que está nas casas.
  if (bm <= 0) return 0;

  let score = 0;

  // Base: jogo confirmado em casas (tem bookmakers)
  score += 8;

  // ✅ Liquidez/cobertura do mercado (reduz "zebra" em ligas menores)
  if (bm >= 10) score += 12;
  else if (bm >= 8) score += 10;
  else if (bm >= 6) score += 7;
  else if (bm >= 4) score += 3;
  else score -= 12;

  // ------------------------------------------------------------
  // 1) SINAIS ESPORTIVOS (independentes de odds)
  // ------------------------------------------------------------
  // Esses sinais devem sempre pontuar quando disponíveis.
  // (Odds podem ser "ruins" em ligas menores, mas standings/forma/predictions continuam úteis.)

  // Predições da API-Football (quando disponível): peso relevante
  const predHomePct = opts?.predHomePct;
  if (typeof predHomePct === "number" && Number.isFinite(predHomePct)) {
    if (predHomePct >= 80) score += 22;
    else if (predHomePct >= 75) score += 18;
    else if (predHomePct >= 70) score += 14;
    else if (predHomePct >= 65) score += 8;
    else if (predHomePct <= 55) score -= 10;
  }

  // Standings gap: posição do visitante - posição do mandante (positivo = mandante melhor)
  const gap = opts?.standingsGap;
  if (typeof gap === "number" && Number.isFinite(gap)) {
    if (gap >= 14) score += 16;
    else if (gap >= 10) score += 12;
    else if (gap >= 6) score += 8;
    else if (gap <= -6) score -= 14;
  }

  // Forma recente (diferença simples de vitórias)
  const fd = opts?.formDelta;
  if (typeof fd === "number" && Number.isFinite(fd)) {
    if (fd >= 4) score += 12;
    else if (fd >= 3) score += 9;
    else if (fd >= 2) score += 6;
    else if (fd <= -2) score -= 12;
  }

  // Vantagem do mandante em casa (win% em casa) - sinal esportivo forte
  const homeHomeWinPct = opts?.homeHomeWinPct;
  if (typeof homeHomeWinPct === "number" && Number.isFinite(homeHomeWinPct)) {
    if (homeHomeWinPct >= 0.70) score += 14;
    else if (homeHomeWinPct >= 0.60) score += 10;
    else if (homeHomeWinPct >= 0.50) score += 6;
    else if (homeHomeWinPct < 0.40) score -= 8;
  }

  // Fragilidade do visitante fora (loss% fora) - sinal esportivo forte
  const awayAwayLossPct = opts?.awayAwayLossPct;
  if (typeof awayAwayLossPct === "number" && Number.isFinite(awayAwayLossPct)) {
    if (awayAwayLossPct >= 0.60) score += 12;
    else if (awayAwayLossPct >= 0.50) score += 8;
    else if (awayAwayLossPct >= 0.40) score += 4;
    else if (awayAwayLossPct < 0.30) score -= 6;
  }

  // H2H básico (últimos N): vantagem do mandante (não precisa ser vitória por 2 gols)
  const h2hM = opts?.h2hMatchesBasic ?? 0;
  const h2hW = opts?.h2hHomeWinsBasic ?? 0;
  if (h2hM >= 3) {
    if (h2hW >= Math.ceil(h2hM * 0.66)) score += 10; // ganhou a maioria
    else if (h2hW >= 1) score += 4;
    else score -= 4;
  }


  // Favorito forte (regra interna)
  if (opts?.favoriteStrong) score += 12;

  // ------------------------------------------------------------
  // 2) SINAIS DE MERCADO (opcionais)
  // ------------------------------------------------------------
  // Se a configuração exigir usar odds como sinal, mantém o bloco antigo.
  if (has1x2 && ODDS_AS_SIGNAL) {
  // Probabilidade implícita normalizada (pós overround). Esse é o melhor “proxy”
  // objetivo de chance antes de puxar stats.
  try {
    const { ph, overround } = impliedProbs(homeOdd!, drawOdd!, awayOdd!);
    // Quanto MENOR a margem, mais "eficiente" o mercado.
    const or = typeof opts?.overround === "number" ? opts.overround : overround;

    if (ph >= 0.72) score += 18;
    else if (ph >= 0.68) score += 12;
    else if (ph >= 0.64) score += 6;
    else score -= 6;

    // Penaliza mercado com margem alta (linhas ruins / pouca liquidez / discrepâncias)
    if (or <= 1.06) score += 6;
    else if (or <= 1.08) score += 3;
    else if (or >= 1.12) score -= 10;
    else if (or >= 1.10) score -= 6;
  } catch {}

  // Faixa de odds (foco em favoritos fortes/moderados, evitando extremos)
  if (homeOdd >= 1.30 && homeOdd <= 1.55) score += 20;
  else if (homeOdd <= 1.60) score += 16;
  else if (homeOdd <= 1.75) score += 10;
  else if (homeOdd <= 2.00) score += 4;
  else score -= 4;

  // Empate mais "caro" geralmente indica maior domínio do favorito (mercado 1X2)
  if (drawOdd >= 3.40) score += 8;
  else if (drawOdd >= 3.10) score += 4;
  else score -= 6;

  // Diferença de odds (favoritismo)
  const oddsDiff = Math.abs(awayOdd - homeOdd);
  if (oddsDiff >= 4.0) score += 14;
  else if (oddsDiff >= 2.5) score += 10;
  else if (oddsDiff >= 1.5) score += 6;
  else if (oddsDiff >= 1.0) score += 3;
  else score -= 6;

  // Favorito forte (casa) - V2 (mais rígido)
  if (opts?.favoriteStrong) score += 14;

  }

  // H2H forte (peso menor; é volátil)
  let h2hScore = 0;
  if (h2hConsidered >= 3) {
    if (h2hStrongWins === 3) h2hScore = 10;
    else if (h2hStrongWins === 2) h2hScore = 6;
    else if (h2hStrongWins === 1) h2hScore = 2;
    else h2hScore = -2;
  } else if (h2hConsidered === 2) {
    if (h2hStrongWins === 2) h2hScore = 6;
    else if (h2hStrongWins === 1) h2hScore = 2;
    else h2hScore = -2;
  } else if (h2hConsidered === 1) {
    if (h2hStrongWins === 1) h2hScore = 2;
  } else {
    h2hScore = -2;
  }
  score += h2hScore;

  // Lesões/suspensões (se disponível)
  const injuries = opts?.injuriesCount;
  if (typeof injuries === "number") {
    if (injuries <= 1) score += 6;
    else if (injuries === 2) score += 2;
    else if (injuries >= 4) score -= 10;
    else score -= 4; // 3 ausências
  }

  // “Time principal provável” (se disponível)
  if (typeof opts?.mainSquadLikely === "boolean") {
    score += opts.mainSquadLikely ? 8 : -12;
  }

  // Forma recente (se disponível)
  if (typeof opts?.formGood === "boolean") {
    score += opts.formGood ? 6 : -6;
  }

  // Ajuste final: limitar 0..100
  return Math.min(100, Math.max(0, score));
}


// Identificar se o mandante é um "favorito forte" (para destacar no WhatsApp)
// ✅ Versão V2: usa probabilidades implícitas normalizadas (inclui empate) + faixa de odds + liquidez (bookmakers)
function impliedProbs(homeOdd: number, drawOdd: number, awayOdd: number) {
  const ph = 1 / homeOdd;
  const pd = 1 / drawOdd;
  const pa = 1 / awayOdd;
  const overround = ph + pd + pa; // margem da casa (quanto mais alto, "pior" o mercado)
  return {
    ph: ph / overround,
    pd: pd / overround,
    pa: pa / overround,
    overround,
  };
}

// Estimativa de probabilidade de vitória do mandante (NÃO é garantia).
// Filosofia:
// - Prioriza sinais esportivos (predições, standings, forma, H2H forte)
// - Usa odds apenas como "sanity check" quando disponíveis
function estimateHomeWinProbability(opts: {
  apiPredHomePct?: number;
  standingsGap?: number;
  formDelta?: number;
  h2hStrongWins?: number;
  h2hStrongConsidered?: number;
  score?: number;
  has1x2Odds?: boolean;
  homeOdd?: number;
  drawOdd?: number;
  awayOdd?: number;
}): number {
  // Base: predição da API (quando existe)
  let p = 0.5;
  if (typeof opts.apiPredHomePct === "number" && Number.isFinite(opts.apiPredHomePct)) {
    p = Math.min(0.92, Math.max(0.08, opts.apiPredHomePct / 100));
  } else if (typeof opts.score === "number" && Number.isFinite(opts.score)) {
    // Converter score (0..100) em prob via sigmoid (calibrável por backtest)
    const x = (opts.score - 75) / 7.5; // 75 ~ limiar de aprovação
    p = 1 / (1 + Math.exp(-x));
    // limitar extremos
    p = Math.min(0.90, Math.max(0.10, p));
  }

  // Ajustes por sinais esportivos
  const gap = opts.standingsGap;
  if (typeof gap === "number" && Number.isFinite(gap)) {
    if (gap >= 12) p += 0.03;
    else if (gap >= 8) p += 0.02;
    else if (gap <= -6) p -= 0.04;
  }

  const fd = opts.formDelta;
  if (typeof fd === "number" && Number.isFinite(fd)) {
    if (fd >= 3) p += 0.02;
    else if (fd >= 2) p += 0.01;
    else if (fd <= -2) p -= 0.03;
  }

  // H2H forte (>=2 gols) é raro, mas quando aparece reforça
  const hs = opts.h2hStrongWins ?? 0;
  const hc = opts.h2hStrongConsidered ?? 0;
  if (hc >= 3) {
    if (hs >= 2) p += 0.02;
    else if (hs === 0) p -= 0.01;
  }

  // Sanity check com odds (não é base): se odds implicam bem menos que o modelo, reduz.
  if (opts.has1x2Odds && opts.homeOdd && opts.drawOdd && opts.awayOdd) {
    try {
      const imp = impliedProbs(opts.homeOdd, opts.drawOdd, opts.awayOdd).ph;
      const delta = p - imp;
      if (delta > 0.15) p -= 0.04; // possível informação faltando
      if (delta < -0.15) p += 0.01; // seu modelo pode estar conservador
    } catch {
      // ignore
    }
  }

  return Math.min(0.92, Math.max(0.08, p));
}

// Estimar distribuição 1X2 (Casa/Empate/Fora) a partir da probabilidade do mandante.
// Observação: isso NÃO é garantia; é uma distribuição calibrável via backtest.
function estimate1X2Probabilities(opts: {
  pHome: number; // 0..1
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  standingsGap?: number;
  formDelta?: number;
}): { ph: number; pd: number; pa: number } {
  let ph = Math.min(0.92, Math.max(0.05, Number(opts.pHome) || 0.5));

  // Base de empate (média histórica de ligas grandes gira ~24%–28%).
  let pd = 0.26;

  // Quanto maior a dominância do mandante, menor a chance de empate.
  // dominância 0 (50/50) -> empate alto; dominância 1 (pHome ~1) -> empate baixo.
  const dominance = Math.min(1, Math.max(0, (ph - 0.5) * 2));
  pd = pd * (1 - 0.70 * dominance);

  // Se o jogo parece desequilibrado (gap/forma), reduz empate.
  const gap = typeof opts.standingsGap === "number" && Number.isFinite(opts.standingsGap) ? opts.standingsGap : 0;
  const fd = typeof opts.formDelta === "number" && Number.isFinite(opts.formDelta) ? opts.formDelta : 0;
  if (gap >= 10) pd -= 0.02;
  else if (gap >= 6) pd -= 0.01;
  if (fd >= 3) pd -= 0.01;

  // Se o jogo parece equilibrado (gap/forma baixos), aumenta empate um pouco.
  if (Math.abs(gap) <= 2 && Math.abs(fd) <= 1) pd += 0.02;

  // Ajuste por “tendência de gols” usando placar previsto quando existir.
  const hs = typeof opts.predictedHomeScore === "number" ? opts.predictedHomeScore : null;
  const as = typeof opts.predictedAwayScore === "number" ? opts.predictedAwayScore : null;
  if (hs !== null && as !== null) {
    const total = hs + as;
    if (total <= 2) pd += 0.04; // jogos de poucos gols empatam mais
    else if (total >= 4) pd -= 0.03; // jogos abertos empatam menos
  }

  // Clamp de empate para evitar extremos irreais.
  pd = Math.min(0.35, Math.max(0.08, pd));

  // Fora é o restante.
  let pa = 1 - ph - pd;

  // Garantir mínimo técnico de visitante (sempre existe risco real).
  if (pa < 0.03) {
    const deficit = 0.03 - pa;
    pa = 0.03;
    pd = Math.max(0.08, pd - deficit);
  }

  // Renormalizar (por segurança numérica)
  const sum = ph + pd + pa;
  ph /= sum;
  pd /= sum;
  pa /= sum;

  return { ph, pd, pa };
}

// Confiança (qualidade do cenário/dados). NÃO é probabilidade.
function estimateConfidence(opts: {
  bookmakersCount: number;
  has1x2Odds: boolean;
  marketOverround?: number;
  apiPredHomePct?: number;
  standingsGap?: number;
  formDelta?: number;
  h2hStrongConsidered?: number;
}): number {
  let c = 0.55;

  // Liquidez/cobertura
  if (opts.bookmakersCount >= 12) c += 0.12;
  else if (opts.bookmakersCount >= 8) c += 0.07;
  else if (opts.bookmakersCount >= 6) c += 0.04;
  else c -= 0.08;

  if (opts.has1x2Odds) c += 0.06;
  else c -= 0.10;

  // Overround (quanto menor, mais "limpo" o mercado)
  if (typeof opts.marketOverround === "number" && Number.isFinite(opts.marketOverround)) {
    if (opts.marketOverround <= 1.06) c += 0.06;
    else if (opts.marketOverround <= 1.08) c += 0.03;
    else if (opts.marketOverround > 1.12) c -= 0.06;
  }

  // Sinais esportivos adicionais aumentam confiabilidade do modelo
  if (typeof opts.apiPredHomePct === "number" && Number.isFinite(opts.apiPredHomePct)) c += 0.06;
  if (typeof opts.standingsGap === "number" && Number.isFinite(opts.standingsGap)) c += 0.03;
  if (typeof opts.formDelta === "number" && Number.isFinite(opts.formDelta)) c += 0.03;
  if (Number(opts.h2hStrongConsidered ?? 0) >= 3) c += 0.02;

  return Math.min(0.95, Math.max(0.25, c));
}

function isStrongHomeFavorite(
  homeOdd?: number,
  drawOdd?: number,
  awayOdd?: number,
  bookmakersCount: number = 0
): boolean {
  if (!homeOdd || !drawOdd || !awayOdd) return false;

  // Liquidez/cobertura mínima: sem isso, "favorito forte" vira armadilha em ligas menores
  if (bookmakersCount < 6) return false;

  // Faixa de odds onde o mercado costuma ser mais estável (evita favoritismo "forçado")
  if (homeOdd < 1.30 || homeOdd > 1.60) return false;

  // Empate e visitante precisam estar "caros" o suficiente para indicar domínio real
  if (drawOdd < 3.40) return false;
  if (awayOdd < 5.00) return false;

  const { ph, pa } = impliedProbs(homeOdd, drawOdd, awayOdd);

  // Probabilidade implícita normalizada (pós overround)
  return ph >= 0.66 && pa <= 0.16;
}



// Calcular vitórias fortes do mandante nos últimos confrontos diretos (H2H)
// "Vitória forte" = mandante (do jogo atual) vence por >= 2 gols (independente de ter sido mandante/visitante no H2H)
function getH2HStrongWins(homeTeamId: number, h2hData: any[]): { considered: number; strongWins: number } {
  const recent = (h2hData || []).slice(0, 3);
  let strongWins = 0;

  for (const match of recent) {
    const teams = match.teams || {};
    const goals = match.goals || {};

    const hId = teams.home?.id;
    const aId = teams.away?.id;

    const homeGoals = goals.home ?? 0;
    const awayGoals = goals.away ?? 0;

    // Determinar quantos gols o "homeTeamId" marcou nesse H2H, e quantos sofreu
    let favGoals = 0;
    let oppGoals = 0;

    if (hId === homeTeamId) {
      favGoals = homeGoals;
      oppGoals = awayGoals;
    } else if (aId === homeTeamId) {
      favGoals = awayGoals;
      oppGoals = homeGoals;
    } else {
      // Caso raro: não bate IDs, ignora
      continue;
    }

    if ((favGoals - oppGoals) >= 2) strongWins++;
  }

  return { considered: recent.length, strongWins };
}

// H2H básico (últimos N jogos): quantas vitórias de cada time (pela ótica do jogo atual)
function getH2HBasicWins(
  homeTeamId: number,
  awayTeamId: number,
  h2hData: any[],
  last: number = 10
): { matches: number; homeWins: number; awayWins: number; draws: number } {
  const recent = (h2hData || []).slice(0, last);
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;

  for (const match of recent) {
    const teams = match.teams || {};
    const goals = match.goals || {};

    const hId = teams.home?.id;
    const aId = teams.away?.id;

    const hg = Number(goals.home ?? 0);
    const ag = Number(goals.away ?? 0);

    // ignorar se IDs não batem (segurança)
    const isInMatch = (hId === homeTeamId || aId === homeTeamId) && (hId === awayTeamId || aId === awayTeamId);
    if (!isInMatch) continue;

    // Determinar vencedor do match
    if (hg === ag) {
      draws++;
      continue;
    }

    // Quem ganhou? depende de quem foi home/away naquele match
    const winnerId = hg > ag ? hId : aId;
    if (winnerId === homeTeamId) homeWins++;
    else if (winnerId === awayTeamId) awayWins++;
  }

  return { matches: recent.length, homeWins, awayWins, draws };
}
// Retorna quais critérios bateram (para exportação no WhatsApp)

function getMatchedCriteria(
  homeOdd: number,
  drawOdd: number,
  awayOdd: number,
  bookmakersCount: number,

  opts?: { favoriteStrong?: boolean; h2hConsidered?: number; h2hStrongWins?: number }
): string[] {
  const criteria: string[] = [];
  const has1x2 = !!homeOdd && !!drawOdd && !!awayOdd;
  if (!has1x2) {
    criteria.push("Sem odds 1X2 (confirmado em casas)");
  }

  const h2hConsidered = opts?.h2hConsidered ?? 0;
  const h2hStrongWins = opts?.h2hStrongWins ?? 0;
  const favoriteStrong = !!opts?.favoriteStrong;

  // ✅ Somente CRITÉRIOS FORTES (os comparativos ficam só na tela)
  if (has1x2 && favoriteStrong) {
    criteria.push("⭐ Favorito forte (casa)");
    // Critério extra: mercado 1X2 realmente dominante (normalizado)
    try {
      const { ph } = impliedProbs(homeOdd, drawOdd, awayOdd);
      if (ph >= 0.66) criteria.push("Mercado forte: p(casa) ≥ 66%");
    } catch {}
  }

  if (h2hConsidered >= 3) {
    if (h2hStrongWins === 3) criteria.push("H2H forte: 3/3 vitórias ≥2 gols");
    else if (h2hStrongWins === 2) criteria.push("H2H forte: 2/3 vitórias ≥2 gols");
    else if (h2hStrongWins === 1) criteria.push("H2H forte: 1/3 vitórias ≥2 gols");
    else criteria.push("H2H forte: 0/3 vitórias ≥2 gols");
  } else if (h2hConsidered > 0) {
    criteria.push(`H2H disponível: ${h2hConsidered}/3`);
    if (h2hStrongWins > 0) criteria.push(`H2H forte: ${h2hStrongWins}/${h2hConsidered} vitórias ≥2 gols`);
  } else {
    criteria.push("H2H indisponível");
  }

  // Odd mínima (regra do modo 90%+)
  if (has1x2 && homeOdd >= MIN_RECOMMENDED_ODD) criteria.push(`Odd >= ${MIN_RECOMMENDED_ODD.toFixed(2)}`);

  return criteria;
}

// Gerar previsão de placar baseada nas odds e histórico
function generateScorePrediction(homeOdd: number, awayOdd: number, h2hData?: any[]): {
  homeScore: number;
  awayScore: number;
  confidence: number;
  reasoning: string;
} {
  const safeHomeOdd = homeOdd > 0 ? homeOdd : 2.0;
  const safeAwayOdd = awayOdd > 0 ? awayOdd : 2.0;
  const homeProb = 1 / safeHomeOdd;
  const awayProb = 1 / safeAwayOdd;
  
  let homeScore = 0;
  let awayScore = 0;
  let confidence = 50;
  let reasoning = "";
  
  let h2hHomeGoals = 0;
  let h2hAwayGoals = 0;
  let h2hMatches = 0;
  
  if (h2hData && h2hData.length > 0) {
    for (const match of h2hData.slice(0, 5)) {
      if (match.goals) {
        h2hHomeGoals += match.goals.home || 0;
        h2hAwayGoals += match.goals.away || 0;
        h2hMatches++;
      }
    }
  }
  
  const avgHomeGoals = h2hMatches > 0 ? h2hHomeGoals / h2hMatches : 1.5;
  const avgAwayGoals = h2hMatches > 0 ? h2hAwayGoals / h2hMatches : 1.0;
  
  if (homeProb > 0.6) {
    homeScore = Math.round(avgHomeGoals + 0.5);
    awayScore = Math.round(Math.max(0, avgAwayGoals - 0.5));
    confidence = Math.round(homeProb * 100);
    reasoning = "Time da casa é favorito forte";
  } else if (homeProb > 0.45) {
    homeScore = Math.round(avgHomeGoals);
    awayScore = Math.round(avgAwayGoals);
    confidence = Math.round(homeProb * 100);
    reasoning = "Time da casa tem leve vantagem";
  } else if (awayProb > 0.45) {
    homeScore = Math.round(Math.max(0, avgHomeGoals - 0.5));
    awayScore = Math.round(avgAwayGoals + 0.5);
    confidence = Math.round(awayProb * 100);
    reasoning = "Time visitante é favorito";
  } else {
    homeScore = 1;
    awayScore = 1;
    confidence = 40;
    reasoning = "Jogo equilibrado, possível empate";
  }
  
  homeScore = Math.max(0, Math.min(5, homeScore));
  awayScore = Math.max(0, Math.min(5, awayScore));
  confidence = Math.max(30, Math.min(90, confidence));
  
  return { homeScore, awayScore, confidence, reasoning };
}

// Selecionar casas de apostas aleatórias (simulação quando API não retorna)
function getRandomBookmakers(count: number = 5): string[] {
  const shuffled = [...KNOWN_BOOKMAKERS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  games: router({
    analyze: publicProcedure
      .input(z.object({ 
        apiKey: z.string().optional(), 
        analysisDate: z.enum(['today', 'tomorrow']).optional(),
        newApiKey: z.string().optional(),
        retryWithNewKey: z.boolean().optional(),
        telegramEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        console.log("[Games] Starting analysis of UPCOMING games only...");

        try {
          if (input.newApiKey) {
            setDynamicApiKey(input.newApiKey);
            console.log("[Games] Using NEW API key");
          } else if (input.apiKey) {
            setDynamicApiKey(input.apiKey);
            console.log("[Games] Using API key");
          }

          const status = await getStatus();
          let apiUsed = 0;
          let apiLimit = 100;
          
          if (status?.response?.requests) {
            apiUsed = status.response.requests.current || 0;
            apiLimit = status.response.requests.limit_day || 100;
            console.log(`[Games] API: ${apiUsed}/${apiLimit} used`);
          }

          const dateType = input.analysisDate || 'today';
          const dateLabel = dateType === 'today' ? 'hoje' : 'amanhã';
          console.log(`[Games] Fetching UPCOMING fixtures for ${dateLabel}...`);

          // Telegram ON/OFF vindo do botão
          if (typeof input.telegramEnabled === "boolean") {
            saveSettings({
              telegramEnabled: input.telegramEnabled,
              telegramChatId: process.env.TELEGRAM_CHAT_ID,
              resultPollSeconds: Number(process.env.RESULT_POLL_SECONDS || 30),
            });
            if (input.telegramEnabled) {
              startTelegramFinalWatcher();
            } else {
              stopTelegramFinalWatcher();
            }
          }
          
          // IMPORTANTE: Usar fetchUpcomingFixtures para pegar apenas jogos futuros
          const allFixtures = await fetchUpcomingFixtures(dateType);
          console.log(`[Games] Found ${allFixtures.length} UPCOMING fixtures`);

          // Pull odds for the whole day in one shot (massive API savings)
          const TZ = "America/Sao_Paulo";
          const formatDateInTZ = (d: Date, timeZone: string) => {
            return new Intl.DateTimeFormat("en-CA", {
              timeZone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(d);
          };

          const baseDateForOdds = new Date();
          if (dateType === "tomorrow") baseDateForOdds.setDate(baseDateForOdds.getDate() + 1);
          const targetDateIso = formatDateInTZ(baseDateForOdds, TZ);

          const oddsByFixture = await fetchOddsByDate(targetDateIso, TZ);
          console.log(`[Games] Odds loaded for ${oddsByFixture.size} fixtures (date=${targetDateIso})`);

          if (allFixtures.length === 0) {
            return {
              success: true,
              games: [],
              progress: {
                analyzed: 0,
                approved: 0,
                rejected: 0,
                total: 0,
                percentage: 0,
                stopped: true,
                reason: `Nenhum jogo futuro encontrado para ${dateLabel}`,
                apiUsed,
                apiRemaining: apiLimit - apiUsed,
                apiLimit,
              },
              message: `Nenhum jogo futuro encontrado para ${dateLabel}`,
              shouldAskForNewKey: false,
              canFinalize: false,
            };
          }

          
// Analyze games
          const allGames: any[] = [];
          let analyzed = 0;
          let approved = 0;
          let skippedNoOdds = 0;

          const isRateLimitError = (e: any) => {
            const msg = (e?.message || "").toString().toLowerCase();
            return msg.includes("rate limit") || msg.includes("429");
          };

          // Data alvo (para evitar duplicar jogos quando continuar com outra chave)
          // NOTE: do not use toISOString() here (UTC). Keep the same timezone as the API/UI.
          // targetDateIso already computed above with America/Sao_Paulo.

          // Se for continuação, carregar jogos já salvos desse dia e não re-analisar
          const existingForDate = getAllGames().filter(g => {
            try {
              const d = formatDateInTZ(new Date(g.commenceTime), TZ);
              return d === targetDateIso;
            } catch {
              return false;
            }
          });

          const existingFixtureIds = new Set<number>(
            existingForDate
              .map(g => Number(g.gameId))
              .filter(n => !Number.isNaN(n))
          );

          let stoppedByRateLimit = false;
          let stopReason: string | undefined;

          for (let i = 0; i < allFixtures.length; i++) {
            const fixture = allFixtures[i];

            // Pular fixtures já analisadas/salvas quando continuar com outra chave
            if (input.retryWithNewKey && existingFixtureIds.has(fixture.fixture.id)) {
              continue;
            }

            // Verificar novamente se o jogo é futuro
            const fixtureTime = new Date(fixture.fixture.date);
            const now = new Date();
            if (fixtureTime <= now) {
              console.log(`[Games] Skipping past game: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
              continue;
            }

            analyzed++;

            // Tentar buscar odds detalhadas
            let bookmakers: string[] = [];
            let homeOdd = 0;
            let drawOdd = 0;
            let awayOdd = 0;
            let has1x2Odds = false;

            try {
              const detailedOdds = oddsByFixture.get(fixture.fixture.id) ?? null;
              if (detailedOdds) {
                bookmakers = extractBookmakers(detailedOdds);
                // Para "confiança", usamos odds de consenso (média entre casas) quando possível.
                // Isso evita distorção ao misturar o melhor preço de cada outcome.
                const consensus = extractConsensusOdds(detailedOdds);
                const bestOdds = extractBestOdds(detailedOdds);
                if (consensus) {
                  homeOdd = consensus.homeOdd;
                  drawOdd = consensus.drawOdd;
                  awayOdd = consensus.awayOdd;
                } else if (bestOdds) {
                  homeOdd = bestOdds.homeOdd;
                  drawOdd = bestOdds.drawOdd;
                  awayOdd = bestOdds.awayOdd;
                }
              }
            } catch {
              // fall back handled below
            }

            // Se não tem odds 1X2, ainda assim vamos ANALISAR — mas primeiro precisamos GARANTIR que o jogo está em casas.
// Regra: só seguimos se existir ao menos 1 bookmaker retornado pela API (qualquer mercado).
if (bookmakers.length === 0) {
  try {
    const anyOdds = await fetchDetailedOdds(fixture.fixture.id);
    if (anyOdds) {
      bookmakers = extractBookmakers(anyOdds);
      const consensusAny = extractConsensusOdds(anyOdds);
      const bestOddsAny = extractBestOdds(anyOdds);
      if (consensusAny) {
        homeOdd = consensusAny.homeOdd;
        drawOdd = consensusAny.drawOdd;
        awayOdd = consensusAny.awayOdd;
      } else if (bestOddsAny) {
        homeOdd = bestOddsAny.homeOdd;
        drawOdd = bestOddsAny.drawOdd;
        awayOdd = bestOddsAny.awayOdd;
      }
    }
  } catch {}
}

// Se mesmo assim não tem bookmakers, não dá para garantir que está nas casas → pular
if (bookmakers.length === 0) {
  skippedNoOdds++;
  continue;
}

// Determinar se temos odds 1X2 válidas
has1x2Odds = homeOdd > 0 && drawOdd > 0 && awayOdd > 0;

            // Buscar H2H apenas para candidatos (economiza MUITAS requisições)
            let h2hData: any[] = [];

            // Sinais adicionais (somente em candidatos) para deixar o TOP 1 mais "matador"
            let predHomePct: number | undefined;
            let standingsGap: number | undefined;
            let formDelta: number | undefined;
            let homeHomeWinPct: number | undefined;
            let awayAwayLossPct: number | undefined;
            let homeStatsObj: any | undefined;
            let awayStatsObj: any | undefined;

            // Overround do mercado 1X2 (margem implícita) - só faz sentido se tivermos odds 1X2
            let overround: number | undefined;
            if (has1x2Odds) {
              try {
                overround = impliedProbs(homeOdd, drawOdd, awayOdd).overround;
              } catch {}
            }

            // Gerar previsão de placar
            const prediction = generateScorePrediction(homeOdd, awayOdd, h2hData);


// Favorito forte (time da casa) - critério forte e também usado no WhatsApp
const favoriteStrong = has1x2Odds ? isStrongHomeFavorite(homeOdd, drawOdd, awayOdd, bookmakers.length) : false;

// Seleção de candidatos (NÃO usa odds como força; só como filtro mínimo para evitar chamadas inúteis)
// Regras:
// - precisa ter odds 1X2
// - precisa ter cobertura mínima de casas
// - mandante precisa ser favorito (odd menor que do visitante)
// - evita extremos (underdog) para foco "Casa vencer"
const isCandidate = has1x2Odds && bookmakers.length >= 6 && homeOdd < awayOdd && homeOdd <= 2.20;
const isHighCandidate = isCandidate && homeOdd <= 1.80;

if (isCandidate) {
  try {
    h2hData = await fetchH2H(fixture.teams.home.id, fixture.teams.away.id);
  } catch (e: any) {
    if (isRateLimitError(e)) {
      stoppedByRateLimit = true;
      stopReason = "API travou (limite atingido). Insira outra chave para continuar ou finalize para salvar os já analisados.";
      console.warn("[Games] Rate limit hit. Stopping analysis early.");
      break;
    }
    console.warn(`[Games] Could not fetch H2H for fixture ${fixture.fixture.id}`);
  }
}

// Para os candidatos mais fortes, puxa previsões/standings/forma (bem mais assertivo no TOP 1)
if (isHighCandidate) {
  // Predictions
  try {
    const pred = await fetchPredictions(fixture.fixture.id);
    const raw = pred?.predictions?.percent?.home ?? pred?.predictions?.percent?.Home;
    if (raw != null) {
      const n = Number(String(raw).replace(/%/g, "").trim());
      if (Number.isFinite(n)) predHomePct = n;
    }
  } catch (e: any) {
    if (isRateLimitError(e)) {
      stoppedByRateLimit = true;
      stopReason = "API travou (limite atingido). Insira outra chave para continuar ou finalize para salvar os já analisados.";
      console.warn("[Games] Rate limit hit while fetching predictions. Stopping analysis early.");
      break;
    }
  }

  // Standings
  try {
    const standings = await fetchStandings(fixture.league.id, fixture.league.season);
    const table = standings?.league?.standings?.[0];
    if (Array.isArray(table)) {
      const homeRow = table.find((r: any) => r?.team?.id === fixture.teams.home.id);
      const awayRow = table.find((r: any) => r?.team?.id === fixture.teams.away.id);
      const homePos = Number(homeRow?.rank);
      const awayPos = Number(awayRow?.rank);
      if (Number.isFinite(homePos) && Number.isFinite(awayPos)) {
        standingsGap = awayPos - homePos;
      }
    }
  } catch (e: any) {
    if (isRateLimitError(e)) {
      stoppedByRateLimit = true;
      stopReason = "API travou (limite atingido). Insira outra chave para continuar ou finalize para salvar os já analisados.";
      console.warn("[Games] Rate limit hit while fetching standings. Stopping analysis early.");
      break;
    }
  }

  // Forma recente (via team statistics -> 'form')
  const countWins = (formStr: any): number => {
    const s = String(formStr || "").toUpperCase();
    // API-Football usually returns like "WWDLW" (most recent first)
    return (s.match(/W/g) || []).length;
  };

  try {
    // IMPORTANT: não usar Promise.all aqui.
    // O rate-limit do ApiSports é global e nosso applyRateLimit usa um relógio
    // compartilhado; chamadas paralelas podem estourar 429 mesmo com delay.
    const homeStats = await fetchTeamStats(fixture.teams.home.id, fixture.league.id, fixture.league.season);
    const awayStats = await fetchTeamStats(fixture.teams.away.id, fixture.league.id, fixture.league.season);
    homeStatsObj = homeStats;
    awayStatsObj = awayStats;
    const hw = countWins(homeStats?.form);
    const aw = countWins(awayStats?.form);
    if (Number.isFinite(hw) && Number.isFinite(aw)) {
      formDelta = hw - aw;
    }
    // Win% do mandante em casa
    try {
      const playedHome = safeNum(homeStats?.fixtures?.played?.home);
      const winsHome = safeNum(homeStats?.fixtures?.wins?.home);
      if (playedHome > 0) homeHomeWinPct = clamp(winsHome / playedHome, 0, 1);
    } catch {}
    // Loss% do visitante fora
    try {
      const playedAway = safeNum(awayStats?.fixtures?.played?.away);
      const losesAway = safeNum(awayStats?.fixtures?.loses?.away);
      if (playedAway > 0) awayAwayLossPct = clamp(losesAway / playedAway, 0, 1);
    } catch {}
  } catch (e: any) {
    if (isRateLimitError(e)) {
      stoppedByRateLimit = true;
      stopReason = "API travou (limite atingido). Insira outra chave para continuar ou finalize para salvar os já analisados.";
      console.warn("[Games] Rate limit hit while fetching team stats. Stopping analysis early.");
      break;
    }
  }
}

// H2H forte (últimos 3 confrontos): vitórias do mandante por >=2 gols
const h2hStrong = getH2HStrongWins(fixture.teams.home.id, h2hData);

// H2H básico (últimos 10): vitórias do mandante/visitante e empates
const h2hBasic = getH2HBasicWins(
  fixture.teams.home.id,
  fixture.teams.away.id,
  h2hData,
  10
);

// Modo alta assertividade: só prioriza odds >= mínima
if (has1x2Odds && homeOdd && homeOdd < MIN_RECOMMENDED_ODD) {
  continue;
}

// Calcular score (priorização)
const score = calculateScore(homeOdd, drawOdd, awayOdd, h2hStrong.strongWins, h2hStrong.considered, {
  favoriteStrong,
  bookmakersCount: bookmakers.length,
  has1x2Odds,
  predHomePct,
  standingsGap,
  formDelta,
  overround,
  homeHomeWinPct,
  awayAwayLossPct,
  h2hHomeWinsBasic: h2hBasic.homeWins,
  h2hMatchesBasic: h2hBasic.matches,
});

// Probabilidade e confiança (para exibir no card e ordenar TOP 1)
const winProbability = estimateHomeWinProbability({
  apiPredHomePct: predHomePct,
  standingsGap,
  formDelta,
  h2hStrongWins: h2hStrong.strongWins,
  h2hStrongConsidered: h2hStrong.considered,
  score,
  has1x2Odds,
  homeOdd,
  drawOdd,
  awayOdd,
});

const confidence = estimateConfidence({
  bookmakersCount: bookmakers.length,
  has1x2Odds,
  marketOverround: overround,
  apiPredHomePct: predHomePct,
  standingsGap,
  formDelta,
  h2hStrongConsidered: h2hStrong.considered,
});

// Probabilidade FINAL do mandante:
// - NÃO multiplica diretamente pela confiança (isso derruba demais a probabilidade)
// - Usa a confiança como "fator de shrink" para aproximar do 50/50 quando o cenário é incerto
//   p_final = 0.5 + (p_model - 0.5) * conf
const finalWinProb = clamp(0.5 + (winProbability - 0.5) * confidence, 0.05, 0.92);

// Distribuição 1X2 estimada (em cima do p(final) do mandante)
const probs1x2 = estimate1X2Probabilities({
  pHome: finalWinProb,
  predictedHomeScore: prediction.homeScore,
  predictedAwayScore: prediction.awayScore,
  standingsGap,
  formDelta,
});

// Probabilidades implícitas normalizadas (para debug/diagnóstico do TOP 1)
let impliedHomeProb: number | null = null;
let impliedDrawProb: number | null = null;
let impliedAwayProb: number | null = null;
if (has1x2Odds) {
  try {
    const p = impliedProbs(homeOdd, drawOdd, awayOdd);
    impliedHomeProb = p.ph;
    impliedDrawProb = p.pd;
    impliedAwayProb = p.pa;
  } catch {}
}

// ------------------------------------------------------------
// TIER (Fraco/Médio/Forte)
// - Fraco: não atende requisitos mínimos ou p(casa) não é a maior
// - Médio: bom candidato, mas ainda não "matador"
// - Forte: atende critérios máximos (ideal para TOP1)
// Observação: mantemos foco em CASA vencer.
// ------------------------------------------------------------
const APPROVED_THRESHOLD = 60;
const STRONG_THRESHOLD = 85;

const homeIsHighest = probs1x2.ph >= probs1x2.pd && probs1x2.ph >= probs1x2.pa;
const tier = !has1x2Odds
  ? "sem_odds"
  : !homeIsHighest
  ? "fraco"
  : score >= STRONG_THRESHOLD
  ? "forte"
  : score >= APPROVED_THRESHOLD
  ? "medio"
  : "fraco";

if (tier !== "fraco" && tier !== "sem_odds") approved++;

const matchedCriteria = getMatchedCriteria(homeOdd, drawOdd, awayOdd, bookmakers.length, {
  favoriteStrong,
  h2hConsidered: h2hStrong.considered,
  h2hStrongWins: h2hStrong.strongWins,
});

            allGames.push({
              gameId: fixture.fixture.id.toString(),
              fixtureId: fixture.fixture.id,
              homeTeam: fixture.teams.home.name,
              awayTeam: fixture.teams.away.name,
              homeTeamLogo: fixture.teams.home.logo,
              awayTeamLogo: fixture.teams.away.logo,
              league: fixture.league.name,
              leagueLogo: fixture.league.logo,
              country: fixture.league.country,
              homeOdd: Number(homeOdd.toFixed(2)),
              drawOdd: Number(drawOdd.toFixed(2)),
              awayOdd: Number(awayOdd.toFixed(2)),
              impliedHomeProb,
              impliedDrawProb,
              impliedAwayProb,
              marketOverround: overround ?? null,
              apiPredHomePct: typeof predHomePct === "number" ? predHomePct : null,
              standingsGap: typeof standingsGap === "number" ? standingsGap : null,
              formDelta: typeof formDelta === "number" ? formDelta : null,
              strengthScore: score,
              // status usado para a tarja (aprovado/rejeitado) e filtros
              status: !has1x2Odds ? "no_odds" : tier === "fraco" ? "rejected" : "approved",
              // tier sempre aparece: fraco / medio / forte
              strengthTier: tier,
              commenceTime: fixture.fixture.date,
              // Propriedades de casas de apostas
              bookmakers: bookmakers,
              bookmakersCount: bookmakers.length,
              // Previsão de placar
              predictedHomeScore: prediction.homeScore,
              predictedAwayScore: prediction.awayScore,
              predictionConfidence: prediction.confidence,
              predictionReasoning: prediction.reasoning,
              h2hMatches: h2hBasic.matches,
              h2hHomeWins: h2hBasic.homeWins,
              h2hAwayWins: h2hBasic.awayWins,
              h2hDraws: h2hBasic.draws,
              h2hStrongConsidered: h2hStrong.considered,
              h2hStrongWins: h2hStrong.strongWins,
              // Extras para WhatsApp/exportação
              favoriteStrong,
              matchedCriteria,
              has1x2Odds,
              // Probabilidades (estimadas) e qualidade (em %)
              winProbability: Number((finalWinProb * 100).toFixed(1)),
              probHomePct: Number((probs1x2.ph * 100).toFixed(1)),
              probDrawPct: Number((probs1x2.pd * 100).toFixed(1)),
              probAwayPct: Number((probs1x2.pa * 100).toFixed(1)),
              modelProbability: Number((winProbability * 100).toFixed(1)),
              confidence: Number((confidence * 100).toFixed(1)),
              // Resultado real (será preenchido depois)
              realHomeScore: null,
              realAwayScore: null,
              matchStatus: "NS", // Not Started
              resultUpdated: false,
            });
          }

          // Se existirem jogos já salvos para o dia, mesclar com a lista atual (para continuação)
          for (const g of existingForDate) {
            const fixtureIdNum = Number(g.gameId);
            if (Number.isNaN(fixtureIdNum)) continue;

            allGames.push({
              gameId: g.gameId,
              fixtureId: fixtureIdNum,
              homeTeam: g.homeTeam,
              awayTeam: g.awayTeam,
              league: g.league,
              country: g.sportKey,
              homeOdd: Number(g.homeOdd),
              drawOdd: Number(g.drawOdd),
              awayOdd: Number(g.awayOdd),
              strengthScore: g.strengthScore || 0,
              status: g.status,
              commenceTime: g.commenceTime,
              bookmakers: g.criteria?.bookmakers || [],
              bookmakersCount: (g.criteria?.bookmakers || []).length,
              predictedHomeScore: g.criteria?.predictedHomeScore ?? null,
              predictedAwayScore: g.criteria?.predictedAwayScore ?? null,
              predictionConfidence: g.criteria?.predictionConfidence ?? null,
              predictionReasoning: g.criteria?.predictionReasoning ?? "",
              h2hMatches: g.criteria?.h2hMatches ?? 0,
              h2hHomeWins: (g.criteria as any)?.h2hHomeWins ?? (g as any).h2hHomeWins ?? 0,
              h2hAwayWins: (g.criteria as any)?.h2hAwayWins ?? (g as any).h2hAwayWins ?? 0,
              h2hDraws: (g.criteria as any)?.h2hDraws ?? (g as any).h2hDraws ?? 0,
              favoriteStrong: g.criteria?.favoriteStrong ?? (g as any).favoriteStrong ?? false,
              h2hStrongConsidered: g.criteria?.h2hStrongConsidered ?? (g as any).h2hStrongConsidered ?? 0,
              h2hStrongWins: g.criteria?.h2hStrongWins ?? (g as any).h2hStrongWins ?? 0,
              strengthTier: g.criteria?.strengthTier ?? (g as any).strengthTier ?? "",
              matchedCriteria: g.criteria?.matchedCriteria ?? [],
              has1x2Odds: g.criteria?.has1x2Odds ?? false,
              winProbability: (g.criteria as any)?.winProbability ?? (g as any).winProbability ?? null,
              probHomePct: (g.criteria as any)?.probHomePct ?? (g as any).probHomePct ?? null,
              probDrawPct: (g.criteria as any)?.probDrawPct ?? (g as any).probDrawPct ?? null,
              probAwayPct: (g.criteria as any)?.probAwayPct ?? (g as any).probAwayPct ?? null,
              modelProbability: (g.criteria as any)?.modelProbability ?? (g as any).modelProbability ?? null,
              confidence: (g.criteria as any)?.confidence ?? (g as any).confidence ?? null,
              realHomeScore: g.scoreHome ?? null,
              realAwayScore: g.scoreAway ?? null,
              matchStatus: (g as any).matchStatus || "NS",
              resultUpdated: !!g.resultUpdatedAt,
            });
          }
// Sort by score
          allGames.sort((a, b) => (b.winProbability ?? 0) - (a.winProbability ?? 0) || (b.strengthScore - a.strengthScore));
          const topGames = allGames.slice(0, 10);
          const gamesToSave = allGames; // ✅ salva toda a análise (fidelidade do relatório)

          // Save games
          if (gamesToSave.length > 0) {
            for (const game of gamesToSave) {
              await insertGame({
                gameId: game.gameId,
                homeTeam: game.homeTeam,
                awayTeam: game.awayTeam,
                league: game.league,
                analysisDayKey: targetDateIso,
                homeOdd: game.homeOdd.toString(),
                drawOdd: game.drawOdd.toString(),
                awayOdd: game.awayOdd.toString(),
                strengthScore: game.strengthScore,
                status: game.status,
                commenceTime: game.commenceTime,
                sportKey: game.country || "football",
                scoreHome: null,
                scoreAway: null,
                resultUpdatedAt: "",
                completed: false,
                criteria: {
                  bookmakers: game.bookmakers,
                  predictedHomeScore: game.predictedHomeScore,
                  predictedAwayScore: game.predictedAwayScore,
                  predictionConfidence: game.predictionConfidence,
                  predictionReasoning: game.predictionReasoning,
                  h2hMatches: game.h2hMatches,
                  h2hHomeWins: (game as any).h2hHomeWins ?? 0,
                  h2hAwayWins: (game as any).h2hAwayWins ?? 0,
                  h2hDraws: (game as any).h2hDraws ?? 0,
                  h2hStrongConsidered: (game as any).h2hStrongConsidered ?? 0,
                  h2hStrongWins: (game as any).h2hStrongWins ?? 0,
                  favoriteStrong: game.favoriteStrong,
                  matchedCriteria: game.matchedCriteria,
                  strengthTier: (game as any).strengthTier ?? "",
                  has1x2Odds: (game as any).has1x2Odds ?? false,
                  // Probabilidades 1X2 (em %)
                  winProbability: (game as any).winProbability ?? null,
                  probHomePct: (game as any).probHomePct ?? (game as any).winProbability ?? null,
                  probDrawPct: (game as any).probDrawPct ?? null,
                  probAwayPct: (game as any).probAwayPct ?? null,
                  // Diagnóstico do modelo
                  modelProbability: (game as any).modelProbability ?? null,
                  confidence: (game as any).confidence ?? null,
                    // Critérios fortes (sempre presentes para renderização no Telegram)
                    strongCriteria: [
                      {
                        key: "favStrongHome",
                        label: "Favorito forte (time da casa) (odds + mercado 1X2 + liquidez)",
                        passed: !!game.favoriteStrong,
                      },
                      {
                        key: "h2hAvailable",
                        label: "H2H disponível (>= 3 jogos)",
                        passed: Number((game as any).h2hStrongConsidered ?? 0) >= 3,
                        detail: `(${Math.min(3, Number((game as any).h2hStrongConsidered ?? 0))}/3)`,
                      },
                      {
                        key: "h2hStrong3of3",
                        label: "H2H forte (mandante): 3/3 vitórias por ≥2 gols",
                        passed: Number((game as any).h2hStrongWins ?? 0) === 3,
                        detail: `(${Number((game as any).h2hStrongWins ?? 0)}/3)`,
                      },
                      {
                        key: "h2hStrong2of3",
                        label: "H2H forte (mandante): pelo menos 2/3 vitórias por ≥2 gols",
                        passed: Number((game as any).h2hStrongWins ?? 0) >= 2,
                        detail: `(${Number((game as any).h2hStrongWins ?? 0)}/3)`,
                      },
                      {
                        key: "scoreApproval",
                        label: "Score para aprovação (>= 75)",
                        passed: Number(game.strengthScore ?? 0) >= 75,
                        detail: `(${Math.round(Number(game.strengthScore ?? 0))}/100)`,
                      },
                    ],
                },
              });
            }

            await saveAnalysisHistory({
              date: new Date().toISOString().split('T')[0],
              totalGames: allFixtures.length,
              analyzedGames: analyzed,
              skippedNoOdds,
              approvedGames: approved,
              rejectedGames: analyzed - approved,
              topGames: JSON.stringify(topGames),
            });

            // Telegram: envia lista dos aprovados (somente quando ON)
            try {
              const settings = getSettings();
              if (settings.telegramEnabled && settings.telegramSendListOnAnalyze !== false) {
                const token = process.env.TELEGRAM_BOT_TOKEN;
                const chatId = process.env.TELEGRAM_CHAT_ID;
                if (token && chatId) {
                  const telegram = new TelegramService(token, chatId);
                  // Envia SEMPRE 10 jogos no Telegram (aprovados + rejeitados), classificando o sinal:
                  // - FORTE: aprovado e bateu TODOS os critérios-base
                  // - MÉDIO: aprovado mas faltou algum critério-base
                  // - FRACO: rejeitado
                  const top10All = gamesToSave
                    .slice()
                    .sort((a: any, b: any) => (b.strengthScore || 0) - (a.strengthScore || 0))
                    .slice(0, 10);

                  if (top10All.length > 0) {
                    // Preparar resumo final do dia: define a "data da lista" e reseta flag de resumo
                    // O resumo final e os alerts continuam considerando apenas os APROVADOS.
                    const approvedForTracking = top10All.filter((g: any) => g.status === "approved");

                    saveSettings({
                      telegramDayKey: targetDateIso,
                      telegramSummarySent: false,
                      telegramTopGameIds: approvedForTracking.map((g: any) => String(g.gameId || g.id || "")),
                    });

                    const esc = (s: any) =>
                      String(s ?? "")
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");

                    const fmtOdd = (v: any) => {
                      const n = Number(v);
                      if (!n || Number.isNaN(n)) return "N/A";
                      return n.toFixed(2);
                    };

                    const fmtTime = (iso: string) => {
                      try {
                        return new Intl.DateTimeFormat("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(iso));
                      } catch {
                        return "";
                      }
                    };

                    const renderCriteria = (criteria: any[]) => {
                      if (!Array.isArray(criteria) || criteria.length === 0) return "<i>Sem critérios.</i>";
                      return criteria
                        .map((c: any) => {
                          const mark = c?.passed ? "✓" : "✗";
                          const detail = c?.detail ? ` <b>${esc(c.detail)}</b>` : "";
                          return `${mark} ${esc(c?.label || "")}${detail}`;
                        })
                        .join("\n");
                    };

                    const renderBookmakers = (books: any[]) => {
                      const arr = Array.isArray(books) ? books : [];
                      const unique = Array.from(new Set(arr.map((b: any) => String(b))));
                      if (unique.length === 0) return "N/A";
                      const shown = unique.slice(0, 6);
                      const extra = unique.length > shown.length ? ` +${unique.length - shown.length}` : "";
                      return `${shown.map(esc).join(", ")}${extra}`;
                    };

                    const headerDate = targetDateIso;
                    const pollSeconds = Number(getSettings().resultPollSeconds || process.env.RESULT_POLL_SECONDS || 120);
                    const header = [
                      "🏆 <b>INVESTBET • TOP 10 DO DIA</b> 🔥",
                      `📅 <b>${esc(headerDate)}</b> (${dateType === "today" ? "Hoje" : "Amanhã"})`,
                      `🎯 Especialidade: <b>Casa ou Empate (1X)</b>`,
                      `📩 <i>Resultados individuais ao finalizar + lista viva atualizada</i>`,
                      "",
                    ].join("\n");

                    const classifySignal = (g: any) => {
                      // Preferimos o tier calculado no servidor (Fraco/Médio/Forte)
                      const st = String(g.strengthTier || "").toLowerCase();
                      const strongCriteria = g?.criteria?.strongCriteria || g?.strongCriteria || [];
                      if (st === "forte") {
                        return { tier: "FORTE", icon: "🔥", label: "Aprovado (nível forte)", strongCriteria };
                      }
                      if (st === "medio") {
                        return { tier: "MÉDIO", icon: "🟡", label: "Aprovado (nível médio)", strongCriteria };
                      }
                      return { tier: "FRACO", icon: "🔻", label: "Rejeitado (nível fraco)", strongCriteria };
                    };

                    const blocks = top10All
                      .map((g: any, idx: number) => {
                        const t = fmtTime(g.commenceTime);
                        const fav = g.favoriteStrong ? "<b>SIM</b>" : "<b>NÃO</b>";

                        const fmtPct = (v: any) => {
                          const n = Number(v);
                          return Number.isFinite(n) ? `${n.toFixed(1)}%` : "N/A";
                        };

                        const s = classifySignal(g);

                        return [
                          "━━━━━━━━━━━━━━━━━━━━",
                          `<b>${idx + 1}️⃣ ${esc(g.homeTeam)} vs ${esc(g.awayTeam)}</b>`,
                          `⏰ ${esc(t)} | ⭐ Favorito forte (casa): ${fav} | ${s.icon} <b>Sinal:</b> <b>${esc(s.tier)}</b> — <i>${esc(s.label)}</i>`,
                          `💰 Odds: <b>${fmtOdd(g.homeOdd)}</b> | ${fmtOdd(g.drawOdd)} | ${fmtOdd(g.awayOdd)}`,
                          `📊 Prob: Casa <b>${fmtPct(g.probHomePct ?? g.winProbability)}</b> | Empate <b>${fmtPct(g.probDrawPct)}</b> | Fora <b>${fmtPct(g.probAwayPct)}</b>`,
                          `🏪 Casas: ${renderBookmakers(g.bookmakers)}`,
                          "",
                          "<b>Critérios fortes</b>",
                          renderCriteria(s.strongCriteria),
                          "",
                        ].join("\n");
                      })
                      .join("\n");
                    const footer = [
                      "━━━━━━━━━━━━━━━━━━━━",
                      "",
                      `🕒 <i>Checagem a cada ${Math.max(1, Math.round(pollSeconds / 60))} min</i>`,
                      "⚡ <i>O robô atualiza a lista conforme os jogos finalizam</i>",
                      "",
                      "✅ <b>GREEN</b> → Casa vence <b>ou empata</b>",
                      "❌ <b>RED</b> → Casa perde",
                    ].join("\n");

                    const full = `${header}${blocks}${footer}`;

                    // Telegram tem limite (~4096). Se estourar, dividir mantendo a elegância.
                    const limit = 3900;
                    const parts: string[] = [];
                    let buf = "";
                    for (const chunk of full.split("\n━━━━━━━━━━━━━━━━━━━━\n")) {
                      const piece = (buf ? "\n━━━━━━━━━━━━━━━━━━━━\n" : "") + chunk;
                      if ((buf + piece).length > limit) {
                        if (buf) parts.push(buf);
                        buf = chunk;
                      } else {
                        buf += piece;
                      }
                    }
                    if (buf) parts.push(buf);

                    for (const p of parts) {
                      await telegram.sendMessage(p);
                    }
                  }
                }
              }
            } catch (e: any) {
              console.warn("[Telegram] Falha ao enviar lista:", e?.message || e);
            }
          }

          return {
            success: true,
            games: topGames,
            progress: {
              analyzed,
              approved,
              rejected: analyzed - approved,
              total: allFixtures.length,
              percentage: Math.round((analyzed / allFixtures.length) * 100),
              stopped: stoppedByRateLimit,
              reason: stoppedByRateLimit ? stopReason : undefined,
              skippedNoOdds,
              apiUsed,
              apiRemaining: Math.max(0, apiLimit - apiUsed),
              apiLimit,
            },
            message: stoppedByRateLimit
              ? `Análise pausada por limite da API: ${topGames.length} jogos retornados até agora`
              : `Análise completa: ${topGames.length} jogos FUTUROS retornados (pulados sem odds: ${skippedNoOdds})`,
            shouldAskForNewKey: stoppedByRateLimit,
            canFinalize: analyzed > 0,
          };
        } catch (error: any) {
          console.error("[Games] Error:", error.message);
          return {
            success: false,
            games: [],
            progress: {
              analyzed: 0,
              approved: 0,
              rejected: 0,
              total: 0,
              percentage: 0,
              stopped: true,
              reason: error.message,
            },
            message: `Error: ${error.message}`,
            shouldAskForNewKey: false,
            canFinalize: false,
          };
        }
      }),

    // Rota para atualizar o placar real de um jogo
    updateResult: publicProcedure
      .input(z.object({ 
        gameId: z.string(),
        fixtureId: z.number().optional(),
        apiKey: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        console.log(`[Games] Updating result for game ${input.gameId}...`);
        
        try {
          // Usar API key se fornecida
          if (input.apiKey) {
            setDynamicApiKey(input.apiKey);
          }
          
          const fixtureId = input.fixtureId || parseInt(input.gameId);
          
          if (isNaN(fixtureId)) {
            return {
              success: false,
              message: "ID do jogo inválido",
              result: null
            };
          }
          
          const result = await fetchFixtureResult(fixtureId);
          
          if (!result) {
            return {
              success: false,
              message: "Não foi possível buscar o resultado",
              result: null
            };
          }
          
          // Atualizar no storage
          await updateGameResult(input.gameId, {
            scoreHome: result.homeScore,
            scoreAway: result.awayScore,
            matchStatus: result.statusShort,
            completed: result.finished,
            resultUpdatedAt: new Date().toISOString()
          });
          
          return {
            success: true,
            message: result.finished 
              ? `Jogo finalizado: ${result.homeScore} x ${result.awayScore}` 
              : `Status: ${result.status} (${result.homeScore ?? 0} x ${result.awayScore ?? 0})`,
            result: {
              homeScore: result.homeScore,
              awayScore: result.awayScore,
              status: result.status,
              statusShort: result.statusShort,
              finished: result.finished,
              elapsed: result.elapsed
            }
          };
        } catch (error: any) {
          console.error(`[Games] Error updating result:`, error.message);
          return {
            success: false,
            message: `Erro ao buscar resultado: ${error.message}`,
            result: null
          };
        }
      }),

    // Rota para atualizar todos os resultados pendentes
    updateAllResults: publicProcedure
      .input(z.object({ 
        apiKey: z.string().optional()
      }).optional())
      .mutation(async ({ input }) => {
        console.log("[Games] Updating all pending results...");
        
        try {
          // Usar API key se fornecida
          if (input?.apiKey) {
            setDynamicApiKey(input.apiKey);
          }
          
          const allGames = await getAllGames();
          const pendingGames = allGames.filter(g => !g.completed);
          
          let updated = 0;
          let finished = 0;
          const results: any[] = [];
          
          for (const game of pendingGames) {
            const fixtureId = parseInt(game.gameId);
            if (isNaN(fixtureId)) continue;
            
            try {
              const result = await fetchFixtureResult(fixtureId);
              if (result) {
                await updateGameResult(game.gameId, {
                  scoreHome: result.homeScore,
                  scoreAway: result.awayScore,
                  matchStatus: result.statusShort,
                  completed: result.finished,
                  resultUpdatedAt: new Date().toISOString()
                });
                
                updated++;
                if (result.finished) finished++;
                
                results.push({
                  gameId: game.gameId,
                  homeTeam: game.homeTeam,
                  awayTeam: game.awayTeam,
                  homeScore: result.homeScore,
                  awayScore: result.awayScore,
                  status: result.status,
                  finished: result.finished
                });
              }
            } catch (e) {
              console.warn(`Could not update result for game ${game.gameId}`);
            }
          }
          
          return {
            success: true,
            message: `${updated} jogos atualizados, ${finished} finalizados`,
            updated,
            finished,
            results
          };
        } catch (error: any) {
          console.error("[Games] Error updating all results:", error.message);
          return {
            success: false,
            message: `Erro: ${error.message}`,
            updated: 0,
            finished: 0,
            results: []
          };
        }
      }),

    // Telegram: ler configurações
    telegramSettings: publicProcedure.query(() => {
      return getSettings();
    }),

    // Telegram: ativar/desativar monitoramento e envio (somente final)
    setTelegramEnabled: publicProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(({ input }) => {
        const next = saveSettings({ telegramEnabled: input.enabled });
        if (input.enabled) startTelegramFinalWatcher();
        else stopTelegramFinalWatcher();
        return { success: true, settings: next };
      }),

    today: publicProcedure.query(async () => {
      return await getTodaysGames();
    }),

    // Rota para histórico com jogos
    history: publicProcedure.query(async () => {
      const history = await getAnalysisHistory();
      return history.map(h => {
        let games: any[] = [];
        try {
          if (h.topGames) {
            games = JSON.parse(h.topGames);
          }
        } catch (e) {
          games = [];
        }
        return {
          ...h,
          games,
        };
      });
    }),

    // Rota para todos os jogos salvos
    allGames: publicProcedure.query(async () => {
      return await getAllGames();
    }),

    // ✅ Limpar histórico (zera jogos + sessões + estatísticas)
    clearHistory: publicProcedure.mutation(async () => {
      const ok = clearAllData();
      return {
        success: ok,
        message: ok ? "Histórico limpo com sucesso" : "Não foi possível limpar o histórico",
      };
    }),

    // Rota para jogos por data
    gamesByDate: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        const allGames = await getAllGames();
        return allGames.filter(g => {
          const gameDate = new Date(g.commenceTime).toISOString().split("T")[0];
          return gameDate === input.date;
        });
      }),

    getHistory: publicProcedure.query(async () => {
      return await getAnalysisHistory();
    }),

    getHistoryByDate: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return await getAnalysisHistoryByDate(input.date);
      }),
  }),
});

export type AppRouter = typeof appRouter;