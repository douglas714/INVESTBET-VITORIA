import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, games, statistics, analysisHistory, InsertGame, Game, Statistic, AnalysisHistory, InsertAnalysisHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Game management functions

/**
 * Insert a new game into the database
 */
export async function insertGame(game: InsertGame): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert game: database not available");
    return;
  }

  try {
    await db.insert(games).values(game).onDuplicateKeyUpdate({
      set: {
        homeOdd: game.homeOdd,
        drawOdd: game.drawOdd,
        awayOdd: game.awayOdd,
        status: game.status,
      },
    });
  } catch (error) {
    console.error("[Database] Failed to insert game:", error);
    throw error;
  }
}

/**
 * Get all games for today
 */
export async function getTodaysGames(): Promise<Game[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get games: database not available");
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select()
    .from(games)
    .where(
      and(
        gte(games.commenceTime, today),
        lte(games.commenceTime, tomorrow)
      )
    )
    .orderBy(games.commenceTime);

  return result;
}

/**
 * Update game status and score
 */
export async function updateGameResult(
  gameId: string,
  status: "green" | "red",
  scoreHome?: number,
  scoreAway?: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update game: database not available");
    return;
  }

  try {
    await db
      .update(games)
      .set({
        status,
        scoreHome,
        scoreAway,
        completed: true,
        resultUpdatedAt: new Date(),
      })
      .where(eq(games.gameId, gameId));
  } catch (error) {
    console.error("[Database] Failed to update game result:", error);
    throw error;
  }
}

/**
 * Get game by gameId
 */
export async function getGameByGameId(gameId: string): Promise<Game | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get game: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(games)
    .where(eq(games.gameId, gameId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Statistics functions

/**
 * Get or create today's statistics
 */
export async function getTodaysStatistics(): Promise<Statistic | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get statistics: database not available");
    return undefined;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select()
    .from(statistics)
    .where(
      and(
        gte(statistics.date, today),
        lte(statistics.date, tomorrow)
      )
    )
    .limit(1);

  if (result.length > 0) {
    return result[0];
  }

  // Create new statistics for today
  try {
    await db.insert(statistics).values({
      date: today,
      totalGreens: 0,
      totalReds: 0,
      totalGames: 0,
    });

    const newResult = await db
      .select()
      .from(statistics)
      .where(
        and(
          gte(statistics.date, today),
          lte(statistics.date, tomorrow)
        )
      )
      .limit(1);

    return newResult.length > 0 ? newResult[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create statistics:", error);
    return undefined;
  }
}

/**
 * Update statistics based on game results
 */
export async function updateStatistics(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update statistics: database not available");
    return;
  }

  const todaysGames = await getTodaysGames();
  const totalGames = todaysGames.length;
  const totalGreens = todaysGames.filter((g) => g.status === "green").length;
  const totalReds = todaysGames.filter((g) => g.status === "red").length;

  const stats = await getTodaysStatistics();
  if (!stats) {
    return;
  }

  try {
    await db
      .update(statistics)
      .set({
        totalGames,
        totalGreens,
        totalReds,
      })
      .where(eq(statistics.id, stats.id));
  } catch (error) {
    console.error("[Database] Failed to update statistics:", error);
  }
}

// Analysis History functions

/**
 * Save analysis history
 */
export async function saveAnalysisHistory(
  totalAnalyzed: number,
  totalApproved: number,
  logs: string[]
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save analysis history: database not available");
    return;
  }

  try {
    await db.insert(analysisHistory).values({
      analysisDate: new Date(),
      totalAnalyzed,
      totalApproved,
      logs: JSON.stringify(logs),
    });
  } catch (error) {
    console.error("[Database] Failed to save analysis history:", error);
    throw error;
  }
}

/**
 * Get all analysis history
 */
export async function getAnalysisHistory(): Promise<AnalysisHistory[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get analysis history: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(analysisHistory)
    .orderBy(desc(analysisHistory.createdAt))
    .limit(50); // Last 50 analyses

  return result;
}

/**
 * Get analysis history for a specific date
 */
export async function getAnalysisHistoryByDate(date: Date): Promise<AnalysisHistory | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get analysis history: database not available");
    return undefined;
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await db
    .select()
    .from(analysisHistory)
    .where(
      and(
        gte(analysisHistory.analysisDate, startOfDay),
        lte(analysisHistory.analysisDate, endOfDay)
      )
    )
    .orderBy(desc(analysisHistory.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}
