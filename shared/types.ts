import { z } from "zod";

// Game Settings Schema
export const gameSettingsSchema = z.object({
  name: z.string().min(2, "Game name must be at least 2 characters").max(100, "Game name must be less than 100 characters"),
  boardSize: z.number().int().min(3).max(6).default(5),
  cellSize: z.enum(["small", "medium", "large", "xlarge", "xxlarge"]).default("medium"),
  answerTime: z.number().int().min(5).max(120).default(30),
  groupCount: z.number().int().min(1).max(10).default(4),
});

// Question-Answer Schema
export const questionAnswerSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

// Question-Answer Pair Array Schema
export const questionAnswerArraySchema = z.array(questionAnswerSchema)
  .min(1, "At least one question-answer pair is required");

// Game Creation Schema
export const gameCreationSchema = z.object({
  settings: gameSettingsSchema,
  questions: questionAnswerArraySchema,
});

// Player Schema
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
});

// Group Schema
export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  players: z.array(playerSchema),
  hasBingo: z.boolean().default(false),
  bingoPattern: z.array(z.string()).optional(),
});

// Question Schema
export const questionSchema = z.object({
  id: z.string(),
  question: z.string(),
  timeLimit: z.number(),
});

// Answer Option Schema
export const answerOptionSchema = z.object({
  id: z.string(),
  position: z.string(),
  content: z.string(),
  votes: z.number().default(0),
});

// Game State Schema
export const gameStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["waiting", "active", "completed"]),
  boardSize: z.number().int(),
  cellSize: z.enum(["small", "medium", "large", "xlarge", "xxlarge"]),
  answerTime: z.number().int(),
  groupCount: z.number().int(),
  creatorId: z.number(),
  currentQuestion: questionSchema.optional(),
  groups: z.array(groupSchema),
});

// API Provider Schema
export const apiProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["openai", "openrouter", "deepseek", "custom"]),
  apiKey: z.string(),
  apiEndpoint: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
});

// WebSocket Message Types
export const wsMessageTypes = [
  "game_update",
  "player_joined",
  "question",
  "timer",
  "answer_result",
  "bingo_achieved",
  "board_update",
  "error",
  "start_game",
  "end_game",
  "next_question",
  "select_answer",
  "game_over"
] as const;

export type WsMessageType = typeof wsMessageTypes[number];

// User Authentication types
export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

// Game statistics types
export interface GameStats {
  totalGames: number;
  activeGames: number;
  completedGames: number;
  totalPlayers: number;
}

// Admin statistics types
export interface AdminStats {
  totalUsers: number;
  totalGames: number;
  activeGames: number;
  apiProviders: number;
}

// Board Cell types for UI
export type CellSize = "small" | "medium" | "large" | "xlarge" | "xxlarge";
export type CellState = "default" | "selected" | "correct" | "incorrect";

export interface BingoBoardCell {
  id: string;
  position: string;
  content: string;
  state: CellState;
  answer?: string;
}

// Bingo result types
export interface BingoGroupResult {
  groupId: string;
  groupName: string;
  members: {
    id: string;
    name: string;
    color?: string;
  }[];
  pattern: string[];
  boardSize: number;
}
