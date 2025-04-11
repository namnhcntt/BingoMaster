import { randomUUID } from 'crypto';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { shuffleArray, createPositionGrid } from '../client/src/lib/utils';

// Mock data for in-memory storage
interface User {
  id: number;
  email: string;
  password: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface Provider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  apiEndpoint?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

interface Game {
  id: string;
  name: string;
  creatorId: number;
  boardSize: number;
  cellSize: string;
  answerTime: number;
  groupCount: number;
  status: 'waiting' | 'active' | 'completed';
  createdAt: string;
  questions: Array<{
    id: string;
    question: string;
    answer: string;
    used: boolean;
  }>;
  currentQuestion?: {
    id: string;
    question: string;
    timeLimit: number;
  };
  groups: Array<{
    id: string;
    name: string;
    players: Array<{
      id: string;
      name: string;
    }>;
    board: Array<{
      position: string;
      content: string;
      answer: string;
      correct: boolean;
    }>;
    hasBingo: boolean;
    bingoPattern?: string[];
  }>;
}

interface PlayerAnswer {
  playerId: string;
  groupId: string;
  cellId: string;
  position: string;
  timestamp: number;
}

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserLastLogin(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // API Provider methods
  getProvider(id: string): Promise<Provider | undefined>;
  getAllProviders(): Promise<Provider[]>;
  getActiveProvider(): Promise<Provider | undefined>;
  createProvider(provider: Omit<Provider, 'id' | 'createdAt'>): Promise<Provider>;
  updateProvider(id: string, data: Partial<Provider>): Promise<Provider>;
  deleteProvider(id: string): Promise<void>;
  activateProvider(id: string): Promise<Provider>;
  
  // Game methods
  getGame(id: string): Promise<Game | undefined>;
  getUserGames(userId: number): Promise<any[]>;
  createGame(data: {
    name: string;
    creatorId: number;
    boardSize: number;
    cellSize: string;
    answerTime: number;
    groupCount: number;
    questions: Array<{
      question: string;
      answer: string;
    }>;
  }): Promise<Game>;
  updateGameStatus(gameId: string, status: 'waiting' | 'active' | 'completed'): Promise<void>;
  addPlayerToGame(gameId: string, playerName: string): Promise<{
    playerId: string;
    groupId: string;
    groupName: string;
  }>;
  getNextQuestion(gameId: string): Promise<{
    id: string;
    question: string;
    timeLimit: number;
  } | null>;
  updateCurrentQuestion(gameId: string, question: {
    id: string;
    question: string;
    timeLimit: number;
  }): Promise<void>;
  recordPlayerAnswer(gameId: string, playerId: string, groupId: string, cellId: string): Promise<void>;
  getGroupAnswers(gameId: string, groupId: string): Promise<PlayerAnswer[]>;
  setGroupAnswer(gameId: string, groupId: string, cellId: string): Promise<void>;
  getGroupCorrectAnswers(gameId: string, groupId: string): Promise<Array<{
    position: string;
    content: string;
  }>>;
  setGroupBingo(gameId: string, groupId: string, pattern: string[]): Promise<void>;
  
  // Admin methods
  getAdminStats(): Promise<{
    totalUsers: number;
    totalGames: number;
    activeGames: number;
    apiProviders: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private providers: Map<string, Provider>;
  private games: Map<string, Game>;
  private playerAnswers: Map<string, PlayerAnswer[]>;
  private currentUserId: number;

  constructor() {
    this.users = new Map();
    this.providers = new Map();
    this.games = new Map();
    this.playerAnswers = new Map();
    this.currentUserId = 1;
    
    // Create default admin
    this.createUser({
      email: 'admin@example.com',
      password: '$2b$10$dP.ZXZcHmHxk8BtHhv4Dve3k27QXuSYbKA.P/K9n8xABSb4NBnMs.', // "password"
      displayName: 'Admin',
      isAdmin: true
    });
    
    // Create default user
    this.createUser({
      email: 'user@example.com',
      password: '$2b$10$dP.ZXZcHmHxk8BtHhv4Dve3k27QXuSYbKA.P/K9n8xABSb4NBnMs.', // "password"
      displayName: 'User',
      isAdmin: false
    });
    
    // Create default provider
    this.createProvider({
      name: 'OpenAI',
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'sk-your-api-key',
      description: 'OpenAI GPT-4o',
      isActive: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date().toISOString();
    const user: User = { ...userData, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  async updateUserLastLogin(id: number): Promise<void> {
    const user = await this.getUser(id);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      this.users.set(id, user);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Provider methods
  async getProvider(id: string): Promise<Provider | undefined> {
    return this.providers.get(id);
  }

  async getAllProviders(): Promise<Provider[]> {
    return Array.from(this.providers.values());
  }

  async getActiveProvider(): Promise<Provider | undefined> {
    for (const provider of this.providers.values()) {
      if (provider.isActive) {
        return provider;
      }
    }
    return undefined;
  }

  async createProvider(providerData: Omit<Provider, 'id' | 'createdAt'>): Promise<Provider> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const provider: Provider = { ...providerData, id, createdAt };
    this.providers.set(id, provider);
    return provider;
  }

  async updateProvider(id: string, data: Partial<Provider>): Promise<Provider> {
    const provider = await this.getProvider(id);
    if (!provider) {
      throw new Error('Provider not found');
    }
    
    const updatedProvider = { ...provider, ...data };
    this.providers.set(id, updatedProvider);
    return updatedProvider;
  }

  async deleteProvider(id: string): Promise<void> {
    this.providers.delete(id);
  }

  async activateProvider(id: string): Promise<Provider> {
    // Deactivate all providers
    for (const provider of this.providers.values()) {
      provider.isActive = false;
      this.providers.set(provider.id, provider);
    }
    
    // Activate the specified provider
    const provider = await this.getProvider(id);
    if (!provider) {
      throw new Error('Provider not found');
    }
    
    provider.isActive = true;
    this.providers.set(id, provider);
    return provider;
  }

  // Game methods
  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getUserGames(userId: number): Promise<any[]> {
    const games = Array.from(this.games.values())
      .filter(game => game.creatorId === userId)
      .map(game => ({
        id: game.id,
        name: game.name,
        creatorId: game.creatorId,
        boardSize: game.boardSize,
        cellSize: game.cellSize,
        answerTime: game.answerTime,
        groupCount: game.groupCount,
        status: game.status,
        createdAt: game.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return games;
  }

  async createGame(data: {
    name: string;
    creatorId: number;
    boardSize: number;
    cellSize: string;
    answerTime: number;
    groupCount: number;
    questions: Array<{
      question: string;
      answer: string;
    }>;
  }): Promise<Game> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    
    // Create questions with IDs
    const questions = data.questions.map(q => ({
      id: randomUUID(),
      question: q.question,
      answer: q.answer,
      used: false
    }));
    
    // Create groups
    const groups = [];
    for (let i = 0; i < data.groupCount; i++) {
      const groupId = randomUUID();
      const groupName = `Group ${i + 1}`;
      
      // Create board with positions and random questions
      const positions = createPositionGrid(data.boardSize);
      const shuffledQuestions = shuffleArray([...questions]);
      const board = positions.map((position, index) => ({
        position,
        content: shuffledQuestions[index % shuffledQuestions.length].answer,
        answer: shuffledQuestions[index % shuffledQuestions.length].question,
        correct: false
      }));
      
      groups.push({
        id: groupId,
        name: groupName,
        players: [],
        board,
        hasBingo: false
      });
    }
    
    // Create game
    const game: Game = {
      id,
      name: data.name,
      creatorId: data.creatorId,
      boardSize: data.boardSize,
      cellSize: data.cellSize,
      answerTime: data.answerTime,
      groupCount: data.groupCount,
      status: 'waiting',
      createdAt,
      questions,
      groups
    };
    
    this.games.set(id, game);
    return game;
  }

  async updateGameStatus(gameId: string, status: 'waiting' | 'active' | 'completed'): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    game.status = status;
    this.games.set(gameId, game);
  }

  async addPlayerToGame(gameId: string, playerName: string): Promise<{
    playerId: string;
    groupId: string;
    groupName: string;
  }> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.status !== 'waiting') {
      throw new Error('Game has already started or ended');
    }
    
    // Create player ID
    const playerId = randomUUID();
    
    // Find group with least players
    let minPlayersGroup = game.groups[0];
    for (const group of game.groups) {
      if (group.players.length < minPlayersGroup.players.length) {
        minPlayersGroup = group;
      }
    }
    
    // Add player to group
    minPlayersGroup.players.push({
      id: playerId,
      name: playerName
    });
    
    // Update game
    this.games.set(gameId, game);
    
    return {
      playerId,
      groupId: minPlayersGroup.id,
      groupName: minPlayersGroup.name
    };
  }

  async getNextQuestion(gameId: string): Promise<{
    id: string;
    question: string;
    timeLimit: number;
  } | null> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Find unused question
    const unusedQuestion = game.questions.find(q => !q.used);
    if (!unusedQuestion) {
      return null;
    }
    
    // Mark question as used
    unusedQuestion.used = true;
    
    // Return question
    return {
      id: unusedQuestion.id,
      question: unusedQuestion.question,
      timeLimit: game.answerTime
    };
  }

  async updateCurrentQuestion(gameId: string, question: {
    id: string;
    question: string;
    timeLimit: number;
  }): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    game.currentQuestion = question;
    this.games.set(gameId, game);
  }

  async recordPlayerAnswer(gameId: string, playerId: string, groupId: string, cellId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Validate that player belongs to the group
    const group = game.groups.find(g => g.id === groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    
    const player = group.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found in group');
    }
    
    // Find cell by ID
    const cellIdParts = cellId.split('-');
    if (cellIdParts.length !== 2) {
      throw new Error('Invalid cell ID format');
    }
    
    const position = cellIdParts[1];
    
    // Get game answers key
    const answerKey = `${gameId}:${game.currentQuestion?.id}`;
    
    // Get existing answers
    let answers = this.playerAnswers.get(answerKey) || [];
    
    // Check if player already answered
    const existingAnswerIndex = answers.findIndex(a => a.playerId === playerId);
    if (existingAnswerIndex !== -1) {
      // Update existing answer
      answers[existingAnswerIndex] = {
        playerId,
        groupId,
        cellId,
        position,
        timestamp: Date.now()
      };
    } else {
      // Add new answer
      answers.push({
        playerId,
        groupId,
        cellId,
        position,
        timestamp: Date.now()
      });
    }
    
    // Update answers
    this.playerAnswers.set(answerKey, answers);
  }

  async getGroupAnswers(gameId: string, groupId: string): Promise<PlayerAnswer[]> {
    const game = await this.getGame(gameId);
    if (!game || !game.currentQuestion) {
      return [];
    }
    
    // Get answers for current question
    const answerKey = `${gameId}:${game.currentQuestion.id}`;
    const allAnswers = this.playerAnswers.get(answerKey) || [];
    
    // Filter by group
    return allAnswers.filter(a => a.groupId === groupId);
  }

  async setGroupAnswer(gameId: string, groupId: string, cellId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || !game.currentQuestion) {
      throw new Error('Game not found or no current question');
    }
    
    // Find group
    const group = game.groups.find(g => g.id === groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    
    // Find cell by ID
    const cellIdParts = cellId.split('-');
    if (cellIdParts.length !== 2) {
      throw new Error('Invalid cell ID format');
    }
    
    const position = cellIdParts[1];
    const cell = group.board.find(c => c.position === position);
    
    if (!cell) {
      throw new Error('Cell not found');
    }
    
    // Find question by ID
    const question = game.questions.find(q => q.id === game.currentQuestion?.id);
    if (!question) {
      throw new Error('Question not found');
    }
    
    // Check if answer is correct
    const isCorrect = cell.answer === question.question;
    
    // Update cell
    cell.correct = isCorrect;
    
    // Update game
    this.games.set(gameId, game);
  }

  async getGroupCorrectAnswers(gameId: string, groupId: string): Promise<Array<{
    position: string;
    content: string;
  }>> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Find group
    const group = game.groups.find(g => g.id === groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    
    // Get correct cells
    return group.board
      .filter(c => c.correct)
      .map(c => ({
        position: c.position,
        content: c.content
      }));
  }

  async setGroupBingo(gameId: string, groupId: string, pattern: string[]): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Find group
    const group = game.groups.find(g => g.id === groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    
    // Mark group as having bingo
    group.hasBingo = true;
    group.bingoPattern = pattern;
    
    // Update game
    this.games.set(gameId, game);
  }

  // Admin methods
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalGames: number;
    activeGames: number;
    apiProviders: number;
  }> {
    const activeGames = Array.from(this.games.values()).filter(g => g.status === 'active').length;
    
    return {
      totalUsers: this.users.size,
      totalGames: this.games.size,
      activeGames,
      apiProviders: this.providers.size
    };
  }
}

// Create helper function for generating random passwords (used for reset password)
export function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Export storage instance
export const storage = new MemStorage();
