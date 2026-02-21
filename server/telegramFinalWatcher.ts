import { TelegramService } from "./telegramService";
import { fetchFixtureResult } from "./apiFootballService";
import { getAllGames, updateGameResult, getSettings, markTelegramFinalSent, saveSettings } from "./jsonStorage";

function isFinished(short?: string): boolean {
  return short === "FT" || short === "AET" || short === "PEN" || short === "AWD" || short === "WO";
}

function formatScore(homeGoals: number | null, awayGoals: number | null): string {
  const h = typeof homeGoals === "number" ? homeGoals : 0;
  const a = typeof awayGoals === "number" ? awayGoals : 0;
  return `${h} x ${a}`;
}

function formatScoreCompact(homeGoals: number | null, awayGoals: number | null): string {
  const h = typeof homeGoals === "number" ? homeGoals : 0;
  const a = typeof awayGoals === "number" ? awayGoals : 0;
  return `${h}x${a}`;
}

function getDayKeyBR(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso)); // YYYY-MM-DD
  } catch {
    // fallback UTC
    try {
      return new Date(iso).toISOString().split("T")[0];
    } catch {
      return "";
    }
  }
}

function splitTelegram(text: string, limit = 3900): string[] {
  if (!text || text.length <= limit) return [text];
  const parts: string[] = [];
  let buf = "";
  for (const line of text.split("\n")) {
    const next = buf ? `${buf}\n${line}` : line;
    if (next.length > limit) {
      if (buf) parts.push(buf);
      buf = line;
    } else {
      buf = next;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

async function maybeSendDailySummary(telegram: TelegramService) {
  const s = getSettings();
  if (!s.telegramEnabled) return;
  if (!s.telegramDayKey) return;
  if (s.telegramSummarySent) return;

  const dayKey = s.telegramDayKey;
  const all = getAllGames();

  // Se existir lista TOP enviada, gerar resumo apenas desses sinais.
  const topIds = Array.isArray(s.telegramTopGameIds) ? s.telegramTopGameIds.map(String) : [];

  const ofDay = all.filter((g: any) => {
    const k = g.analysisDayKey || getDayKeyBR(g.commenceTime);
    return k === dayKey;
  });

  // Se existir lista TOP enviada, gerar resumo apenas desses jogos (forte/médio/fraco)
  const topFiltered = topIds.length > 0
    ? ofDay.filter((g: any) => topIds.includes(String(g.gameId)))
    : ofDay;

  if (topFiltered.length === 0) return;

  const allDone = topFiltered.every((g: any) => g.completed === true);
  if (!allDone) return;

  // Especialidade: 1X (Casa ou Empate) → GREEN se casa vencer OU empatar
  const greens = topFiltered.filter((g: any) => (Number(g.scoreHome ?? 0) >= Number(g.scoreAway ?? 0))).length;
  const total = topFiltered.length;
  const acc = Math.round((greens / Math.max(1, total)) * 100);

  const lines = topFiltered
    .sort((a: any, b: any) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime())
    .map((g: any, i: number) => {
      const hg = Number(g.scoreHome ?? 0);
      const ag = Number(g.scoreAway ?? 0);
      const isGreen = hg >= ag;
      const tag = isGreen ? "🟢 GREEN ✅" : "🔴 RED ❌";
      return `${i + 1}) ${g.homeTeam} ${hg}x${ag} ${g.awayTeam} — ${tag}`;
    });

  const msg = [
    "📋 RESUMO FINAL DO DIA ✅",
    `📅 ${dayKey} — INVESTBET`,
    "",
    ...lines,
    "",
    `📊 Acertividade do dia: <b>${acc}%</b> (${greens}/${total} greens)`
  ].join("\n");

  console.log(`[TelegramFinalWatcher] Sending daily summary: ${acc}% accuracy`);

  for (const p of splitTelegram(msg)) {
    await telegram.sendMessage(p);
  }

  saveSettings({ telegramSummarySent: true });
}

function buildUpdatedTopListMessage(dayKey: string, games: any[], pollSeconds: number): string {
  const header = [
    "🏆 <b>INVESTBET • TOP 10 DO DIA</b> 🔥",
    `📅 <b>${dayKey}</b>`,
    "🎯 Especialidade: <b>Casa ou Empate (1X)</b>",
    "",
    "<i>📌 Lista atualizada automaticamente conforme finaliza</i>",
  ].join("\n");

  const blocks = games.map((g: any, idx: number) => {
    const t = (() => {
      try {
        return new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(g.commenceTime));
      } catch {
        return "";
      }
    })();

    const completed = !!g.completed;
    const hg = Number(g.scoreHome ?? 0);
    const ag = Number(g.scoreAway ?? 0);
    const isGreen = completed ? (hg >= ag) : false;
    const status = completed
      ? (isGreen ? "🟢 <b>GREEN</b> ✅" : "🔴 <b>RED</b> ❌")
      : "🟡 <b>Aguardando</b> ⏳";

    const scoreTxt = completed ? `📈 <b>${formatScoreCompact(hg, ag)}</b>` : "📈 —";

    return [
      "━━━━━━━━━━━━━━━━━━━━",
      `<b>${idx + 1}️⃣ ${g.homeTeam} x ${g.awayTeam}</b>`,
      `⏰ ${t} | ${status}`,
      `${scoreTxt}`,
    ].join("\n");
  }).join("\n");

  const footer = [
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    `🕒 <i>Checagem: a cada ${Math.max(1, Math.round(pollSeconds / 60))} min</i>`,
    "✅ <b>GREEN</b> → Casa vence <b>ou empata</b>",
    "❌ <b>RED</b> → Casa perde",
  ].join("\n");

  return `${header}\n${blocks}\n${footer}`;
}

let timer: NodeJS.Timeout | null = null;
let isRunning = false;

export function startTelegramFinalWatcher() {
  if (timer) {
    console.log("[TelegramFinalWatcher] Already running, skipping restart");
    return;
  }

  const settings = getSettings();
  if (!settings.telegramEnabled) {
    console.log("[TelegramFinalWatcher] Telegram disabled, not starting");
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[TelegramFinalWatcher] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID não configurados");
    return;
  }

  // Por padrão, checar a cada 2 minutos (pode ser sobrescrito via RESULT_POLL_SECONDS no .env ou settings)
  const pollSeconds = Number(settings.resultPollSeconds || process.env.RESULT_POLL_SECONDS || 120);
  const telegram = new TelegramService(token, chatId);

  console.log(`[TelegramFinalWatcher] Starting with poll interval: ${pollSeconds}s`);

  timer = setInterval(async () => {
    if (isRunning) {
      console.log("[TelegramFinalWatcher] Previous check still running, skipping");
      return;
    }
    isRunning = true;

    try {
      const s = getSettings();
      if (!s.telegramEnabled) {
        console.log("[TelegramFinalWatcher] Telegram disabled, stopping checks");
        return;
      }

      const games = getAllGames();
      const dayKey = s.telegramDayKey;
      const topIds = Array.isArray(s.telegramTopGameIds) ? s.telegramTopGameIds.map(String) : [];

      // Monitorar SEMPRE os 10 do TOP do dia (forte/médio/fraco)
      if (!dayKey || topIds.length === 0) {
        console.log("[TelegramFinalWatcher] No day key or top games configured");
        return;
      }

      const topPending = games.filter((g: any) => {
        // FIX: Comparar gameId como string para evitar problemas de tipo
        const gameIdStr = String(g.gameId || "");
        if (g.sentTelegramFinal) {
          console.log(`[TelegramFinalWatcher] Game ${gameIdStr} already sent`);
          return false;
        }
        const k = g.analysisDayKey || getDayKeyBR(g.commenceTime);
        if (k !== dayKey) {
          return false;
        }
        const isInTop = topIds.includes(gameIdStr);
        if (!isInTop) {
          console.log(`[TelegramFinalWatcher] Game ${gameIdStr} not in top list`);
        }
        return isInTop;
      });

      console.log(`[TelegramFinalWatcher] Found ${topPending.length} pending games to check`);

      // Se não há pendentes, ainda pode ser a hora de enviar o resumo final do dia
      if (topPending.length === 0) {
        console.log("[TelegramFinalWatcher] No pending games, checking for daily summary");
        await maybeSendDailySummary(telegram);
        return;
      }

      let anyFinalized = false;

      // Checar jogos com base no fixtureId (gameId)
      for (const g of topPending) {
        const fixtureId = Number(g.gameId);
        if (!fixtureId || Number.isNaN(fixtureId)) {
          console.warn(`[TelegramFinalWatcher] Invalid fixtureId: ${g.gameId}`);
          continue;
        }

        // Só checar se o jogo já começou (evita custo desnecessário)
        const kick = new Date(g.commenceTime).getTime();
        if (Number.isFinite(kick) && Date.now() < kick) {
          console.log(`[TelegramFinalWatcher] Game ${fixtureId} hasn't started yet`);
          continue;
        }

        console.log(`[TelegramFinalWatcher] Checking fixture ${fixtureId}...`);

        const result = await fetchFixtureResult(fixtureId);
        if (!result) {
          console.log(`[TelegramFinalWatcher] No result found for fixture ${fixtureId}`);
          continue;
        }

        const short = result.statusShort;

        const homeGoals = Number(result.homeScore ?? 0);
        const awayGoals = Number(result.awayScore ?? 0);

        console.log(`[TelegramFinalWatcher] Fixture ${fixtureId}: ${homeGoals}x${awayGoals} (${short})`);

        // ALERTA: gol (casa ou visitante) — sempre para os jogos do TOP 10 do dia
        // Usamos scoreHome/scoreAway do storage como "último placar visto".
        const lastHome = typeof g.scoreHome === "number" ? g.scoreHome : 0;
        const lastAway = typeof g.scoreAway === "number" ? g.scoreAway : 0;

        // FIX: Lógica corrigida - checar se o jogo NÃO está finalizado
        if (!isFinished(short)) {
          const homeDiff = homeGoals - lastHome;
          const awayDiff = awayGoals - lastAway;

          console.log(`[TelegramFinalWatcher] Game in progress: home diff=${homeDiff}, away diff=${awayDiff}`);

          if (homeDiff > 0) {
            for (let i = 0; i < homeDiff; i++) {
              const golMsg = [
                "🚨 GOLLLLL! ⚽️",
                "",
                `🏠 ${g.homeTeam} marcou!`,
                `📈 Placar agora: ${formatScoreCompact(homeGoals, awayGoals)}`,
                `⚽ ${g.homeTeam} x ${g.awayTeam}`,
              ].join("\n");
              console.log(`[TelegramFinalWatcher] Sending goal alert for ${g.homeTeam}`);
              await telegram.sendMessage(golMsg);
            }
          }

          if (awayDiff > 0) {
            for (let i = 0; i < awayDiff; i++) {
              const golMsg = [
                "🚨 GOLLLLL! ⚽️",
                "",
                `🚌 ${g.awayTeam} marcou!`,
                `📈 Placar agora: ${formatScoreCompact(homeGoals, awayGoals)}`,
                `⚽ ${g.homeTeam} x ${g.awayTeam}`,
              ].join("\n");
              console.log(`[TelegramFinalWatcher] Sending goal alert for ${g.awayTeam}`);
              await telegram.sendMessage(golMsg);
            }
          }

          // Atualiza "último placar visto" mesmo sem finalizar
          if (homeGoals !== lastHome || awayGoals !== lastAway) {
            console.log(`[TelegramFinalWatcher] Updating score for game ${g.gameId}`);
            updateGameResult(g.gameId, {
              scoreHome: homeGoals,
              scoreAway: awayGoals,
              matchStatus: short,
              completed: false,
              resultUpdatedAt: new Date().toISOString(),
            });
          }

          continue;
        }

        // FINALIZADO - FIX: Lógica corrigida
        if (!isFinished(short)) {
          console.log(`[TelegramFinalWatcher] Game ${fixtureId} not finished yet (status: ${short})`);
          continue;
        }

        console.log(`[TelegramFinalWatcher] Game ${fixtureId} is finished! Sending final result...`);

        // Especialidade: 1X (Casa ou Empate) → GREEN se casa vencer OU empatar
        const isGreen = homeGoals >= awayGoals;

        // Atualizar storage (placar final)
        updateGameResult(g.gameId, {
          scoreHome: homeGoals,
          scoreAway: awayGoals,
          matchStatus: short,
          completed: true,
          resultUpdatedAt: new Date().toISOString(),
        });

        // Enviar Telegram no formato solicitado
        const header = isGreen ? "🟢 GREEN CONFIRMADO! ✅" : "🔴 RED CONFIRMADO! ❌";
        const market = "Casa ou Empate (1X)";
        const extra = isGreen && homeGoals === awayGoals ? "\n🤝 Empate também conta como GREEN! 🎉" : "";
        const msg = [
          header,
          "",
          `⚽ ${g.homeTeam} x ${g.awayTeam}`,
          `📊 Mercado: ${market}`,
          `📈 Placar final: ${formatScoreCompact(homeGoals, awayGoals)}`,
          extra,
        ].join("\n");

        console.log(`[TelegramFinalWatcher] Sending final result for ${g.gameId}: ${isGreen ? 'GREEN' : 'RED'}`);
        await telegram.sendMessage(msg);

        // Marcar que já enviou (anti-spam) APÓS confirmar o envio
        // FIX: Garantir que o gameId seja uma string para consistência
        markTelegramFinalSent(String(g.gameId));
        anyFinalized = true;
      }

      // Se algum jogo finalizou, reenviar a lista TOP 10 atualizada (interativa)
      if (anyFinalized) {
        console.log("[TelegramFinalWatcher] Games finalized, sending updated top list");
        const s2 = getSettings();
        const dayKey = s2.telegramDayKey || "";
        const topIds = Array.isArray(s2.telegramTopGameIds) ? s2.telegramTopGameIds.map(String) : [];

        if (dayKey && topIds.length > 0) {
          const allNow = getAllGames();
          const topGames = topIds
            .map((id: string) => allNow.find((gg: any) => String(gg.gameId) === String(id)))
            .filter(Boolean);

          const updated = buildUpdatedTopListMessage(dayKey, topGames, pollSeconds);
          for (const p of splitTelegram(updated)) {
            await telegram.sendMessage(p);
          }
        }
      }

      // Depois de processar (e possivelmente finalizar alguns), tenta enviar o resumo final do dia
      await maybeSendDailySummary(telegram);
    } catch (err: any) {
      console.error("[TelegramFinalWatcher] Error in check loop:", err?.message || err);
    } finally {
      isRunning = false;
    }
  }, pollSeconds * 1000);

  console.log(`[TelegramFinalWatcher] Started (poll=${pollSeconds}s)`);
}

export function stopTelegramFinalWatcher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  console.log("[TelegramFinalWatcher] Stopped");
}
