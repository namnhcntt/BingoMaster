import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at")
});

// API Providers table
export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // openai, openrouter, deepseek, custom
  apiKey: text("api_key").notNull(),
  apiEndpoint: text("api_endpoint"),
  description: text("description"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Games table
export const games = pgTable("games", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  boardSize: integer("board_size").notNull(),
  cellSize: text("cell_size").notNull(), // small, medium, large, xlarge, xxlarge
  answerTime: integer("answer_time").notNull(),
  groupCount: integer("group_count").notNull(),
  status: text("status").notNull(), // waiting, active, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Questions table
export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  used: boolean("used").default(false).notNull(),
});

// Groups table
export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id),
  name: text("name").notNull(),
  hasBingo: boolean("has_bingo").default(false).notNull(),
  bingoPattern: text("bingo_pattern"), // JSON array of positions
});

// Players table
export const players = pgTable("players", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id), // Optional link to registered user
});

// Board Cells table
export const boardCells = pgTable("board_cells", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id),
  position: text("position").notNull(), // A1, A2, B1, etc.
  content: text("content").notNull(), // Answer text displayed on the board
  answer: text("answer").notNull(), // Question text that matches this cell
  correct: boolean("correct").default(false).notNull(),
});

// Player Answers table
export const playerAnswers = pgTable("player_answers", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id),
  questionId: text("question_id").notNull().references(() => questions.id),
  playerId: text("player_id").notNull().references(() => players.id),
  groupId: text("group_id").notNull().references(() => groups.id),
  cellId: text("cell_id").notNull(),
  position: text("position").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Define insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true
});

export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  createdAt: true
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  completedAt: true
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true
});

export const insertBoardCellSchema = createInsertSchema(boardCells).omit({
  id: true
});

export const insertPlayerAnswerSchema = createInsertSchema(playerAnswers).omit({
  id: true,
  timestamp: true
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

export type BoardCell = typeof boardCells.$inferSelect;
export type InsertBoardCell = z.infer<typeof insertBoardCellSchema>;

export type PlayerAnswer = typeof playerAnswers.$inferSelect;
export type InsertPlayerAnswer = z.infer<typeof insertPlayerAnswerSchema>;
