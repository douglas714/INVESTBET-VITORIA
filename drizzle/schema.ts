import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Table to store analyzed games and their results
 */
export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique identifier from The Odds API */
  gameId: varchar("gameId", { length: 128 }).notNull().unique(),
  /** Sport key (e.g., soccer_brazil_campeonato) */
  sportKey: varchar("sportKey", { length: 128 }).notNull(),
  /** League/Championship name */
  league: varchar("league", { length: 255 }).notNull(),
  /** Home team name */
  homeTeam: varchar("homeTeam", { length: 255 }).notNull(),
  /** Away team name */
  awayTeam: varchar("awayTeam", { length: 255 }).notNull(),
  /** Game start time */
  commenceTime: timestamp("commenceTime").notNull(),
  /** Home team odd */
  homeOdd: decimal("homeOdd", { precision: 10, scale: 2 }).notNull(),
  /** Draw odd */
  drawOdd: decimal("drawOdd", { precision: 10, scale: 2 }).notNull(),
  /** Away team odd */
  awayOdd: decimal("awayOdd", { precision: 10, scale: 2 }).notNull(),
  /** Game status: waiting, green, red */
  status: mysqlEnum("status", ["waiting", "green", "red"]).default("waiting").notNull(),
  /** Final score home */
  scoreHome: int("scoreHome"),
  /** Final score away */
  scoreAway: int("scoreAway"),
  /** Analysis date */
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
  /** Result updated at */
  resultUpdatedAt: timestamp("resultUpdatedAt"),
  /** Whether game is completed */
  completed: boolean("completed").default(false).notNull(),
});

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

/**
 * Table to store daily statistics
 */
export const statistics = mysqlTable("statistics", {
  id: int("id").autoincrement().primaryKey(),
  /** Date of statistics */
  date: timestamp("date").notNull(),
  /** Total green results */
  totalGreens: int("totalGreens").default(0).notNull(),
  /** Total red results */
  totalReds: int("totalReds").default(0).notNull(),
  /** Total games analyzed */
  totalGames: int("totalGames").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Statistic = typeof statistics.$inferSelect;
export type InsertStatistic = typeof statistics.$inferInsert;

/**
 * Table to store analysis history
 * Each analysis session is saved with a unique date
 */
export const analysisHistory = mysqlTable("analysisHistory", {
  id: int("id").autoincrement().primaryKey(),
  /** Date of the analysis */
  analysisDate: timestamp("analysisDate").notNull(),
  /** Total games analyzed */
  totalAnalyzed: int("totalAnalyzed").default(0).notNull(),
  /** Total games approved */
  totalApproved: int("totalApproved").default(0).notNull(),
  /** Analysis logs (JSON string) */
  logs: text("logs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisHistory = typeof analysisHistory.$inferSelect;
export type InsertAnalysisHistory = typeof analysisHistory.$inferInsert;