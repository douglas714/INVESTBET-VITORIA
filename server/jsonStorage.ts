import fs from "fs";
import path from "path";

/**
 * Sistema de armazenamento em JSON para substituir MySQL
 * Sem dependências de banco de dados!
 */

// Diretório para armazenar dados
const DATA_DIR = path.join(process.cwd(), "data");

// Criar diretório se não existir
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[JSONStorage] Created data directory: ${DATA_DIR}`);
  }
}

// Caminho dos arquivos
const FILES = {
  games: path.join(DATA_DIR, "games.json"),
  analysis: path.join(DATA_DIR, "analysis_history.json"),
  statistics: path.join(DATA_DIR, "statistics.json"),
  settings: path.join(DATA_DIR, "settings.json"),
};

/**
 * Interface para Configurações
 */
export interface SettingsRecord {
  telegramEnabled: boolean;
  telegramChatId?: string;
  telegramSendListOnAnalyze?: boolean;
  resultPollSeconds?: number;
  // Telegram: data (YYYY-MM-DD) da lista enviada e controle de resumo final
  telegramDayKey?: string;
  telegramSummarySent?: boolean;
  telegramTopGameIds?: string[]; // IDs dos jogos do TOP 10
  updatedAt: string;
}

const DEFAULT_SETTINGS: SettingsRecord = {
  telegramEnabled: false,
  telegramSendListOnAnalyze: true,
  resultPollSeconds: Number(process.env.RESULT_POLL_SECONDS || 30),
  telegramSummarySent: false,
  telegramTopGameIds: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Ler arquivo JSON com tratamento de erro
 */
function readJSON(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.warn(`[JSONStorage] Error reading ${filePath}:`, error);
    return [];
  }
}

function readJSONObject<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data);
    return (parsed ?? fallback) as T;
  } catch (error) {
    console.warn(`[JSONStorage] Error reading object ${filePath}:`, error);
    return fallback;
  }
}

function writeJSONObject<T>(filePath: string, data: T): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[JSONStorage] Saved object to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`[JSONStorage] Error writing object ${filePath}:`, error);
    return false;
  }
}

/**
 * Escrever arquivo JSON com tratamento de erro
 */
function writeJSON(filePath: string, data: any[]): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[JSONStorage] Saved to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`[JSONStorage] Error writing ${filePath}:`, error);
    return false;
  }
}

/**
 * Interface para Registro de Jogo
 */
export interface GameRecord {
  gameId: string | number;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: "approved" | "rejected" | "pending";
  strengthTier?: "forte" | "medio" | "fraco";
  strengthScore?: number;
  favoriteStrong?: boolean;
  winProbability?: number;
  probHomePct?: number;
  probDrawPct?: number;
  probAwayPct?: number;
  homeOdd?: number;
  drawOdd?: number;
  awayOdd?: number;
  bookmakers?: string[];
  criteria?: any;
  strongCriteria?: any[];
  scoreHome?: number;
  scoreAway?: number;
  matchStatus?: string;
  completed?: boolean;
  sentTelegramFinal?: boolean;
  analysisDayKey?: string;
  resultUpdatedAt?: string;
  createdAt?: string;
}

/**
 * Ler todos os jogos
 */
export function getAllGames(): GameRecord[] {
  return readJSON(FILES.games);
}

/**
 * Ler jogos de hoje
 */
export function getTodaysGames(): GameRecord[] {
  const games = getAllGames();
  const today = new Date().toISOString().split("T")[0];
  return games.filter((g: any) => {
    const gameDate = (g.commenceTime || "").split("T")[0];
    return gameDate === today;
  });
}

/**
 * Inserir novo jogo
 */
export function insertGame(game: GameRecord): boolean {
  try {
    ensureDataDir();
    const games = readJSON(FILES.games);
    
    // Verificar se já existe (por gameId)
    const existing = games.findIndex((g: any) => String(g.gameId) === String(game.gameId));
    if (existing !== -1) {
      // Atualizar existente
      games[existing] = { ...games[existing], ...game, updatedAt: new Date().toISOString() };
    } else {
      // Inserir novo
      games.push({
        ...game,
        createdAt: new Date().toISOString(),
      });
    }
    
    return writeJSON(FILES.games, games);
  } catch (error) {
    console.error("[JSONStorage] Error inserting game:", error);
    return false;
  }
}

/**
 * Atualizar resultado do jogo
 */
export function updateGameResult(
  gameId: string | number,
  updates: Partial<GameRecord>
): boolean {
  try {
    ensureDataDir();
    const games = readJSON(FILES.games);
    
    // FIX: Comparar gameId como string para evitar problemas de tipo
    const idx = games.findIndex((g: any) => String(g.gameId) === String(gameId));
    if (idx === -1) {
      console.warn(`[JSONStorage] Game ${gameId} not found for update`);
      return false;
    }
    
    games[idx] = {
      ...games[idx],
      ...updates,
      resultUpdatedAt: new Date().toISOString(),
    };
    
    return writeJSON(FILES.games, games);
  } catch (error) {
    console.error("[JSONStorage] Error updating game result:", error);
    return false;
  }
}

/**
 * Marcar que a notificação final foi enviada ao Telegram
 */
export function markTelegramFinalSent(gameId: string | number): boolean {
  try {
    ensureDataDir();
    const games = readJSON(FILES.games);
    
    // FIX: Comparar gameId como string para evitar problemas de tipo
    const gameIdStr = String(gameId);
    const idx = games.findIndex((g: any) => String(g.gameId) === gameIdStr);
    
    if (idx === -1) {
      console.warn(`[JSONStorage] Game ${gameIdStr} not found for marking telegram final sent`);
      return false;
    }
    
    games[idx].sentTelegramFinal = true;
    games[idx].resultUpdatedAt = new Date().toISOString();
    
    console.log(`[JSONStorage] Marked game ${gameIdStr} as telegram final sent`);
    return writeJSON(FILES.games, games);
  } catch (error) {
    console.error("[JSONStorage] Error marking telegram final sent:", error);
    return false;
  }
}

/**
 * Salvar histórico de análise
 */
export function saveAnalysisHistory(analysis: any): boolean {
  try {
    ensureDataDir();
    const history = readJSON(FILES.analysis);
    history.push({
      ...analysis,
      savedAt: new Date().toISOString(),
    });
    return writeJSON(FILES.analysis, history);
  } catch (error) {
    console.error("[JSONStorage] Error saving analysis history:", error);
    return false;
  }
}

/**
 * Obter histórico de análise
 */
export function getAnalysisHistory(): any[] {
  return readJSON(FILES.analysis);
}

/**
 * Obter histórico de análise por data
 */
export function getAnalysisHistoryByDate(date: string): any[] {
  const history = getAnalysisHistory();
  return history.filter((h: any) => {
    const historyDate = (h.date || h.savedAt || "").split("T")[0];
    return historyDate === date;
  });
}

/**
 * Limpar todos os dados
 */
export function clearAllData(): boolean {
  try {
    ensureDataDir();
    writeJSON(FILES.games, []);
    writeJSON(FILES.analysis, []);
    return true;
  } catch (error) {
    console.error("[JSONStorage] Error clearing data:", error);
    return false;
  }
}

/**
 * Obter configurações
 */
export function getSettings(): SettingsRecord {
  const settings = readJSONObject<SettingsRecord>(FILES.settings, DEFAULT_SETTINGS);
  
  // Garantir que telegramTopGameIds seja um array
  if (!Array.isArray(settings.telegramTopGameIds)) {
    settings.telegramTopGameIds = [];
  }
  
  return settings;
}

/**
 * Salvar configurações
 */
export function saveSettings(updates: Partial<SettingsRecord>): SettingsRecord {
  const current = getSettings();
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  writeJSONObject(FILES.settings, updated);
  return updated;
}
