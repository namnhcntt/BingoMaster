import { randomUUID } from 'crypto';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { shuffleArray, createPositionGrid } from '../client/src/lib/utils';
import { db, pool } from './db';
import { 
  users, providers, games, questions, groups, players, boardCells, playerAnswers,
  User, Provider, Game, Question, Group, Player, BoardCell, PlayerAnswer,
  InsertUser, InsertProvider
} from '@shared/schema';
import { IStorage } from './storage';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });

    // Initialize default data (only run on first startup)
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Check if admin user exists
    const adminUsers = await db.select().from(users).where(eq(users.isAdmin, true));
    
    if (adminUsers.length === 0) {
      // Create default admin
      await this.createUser({
        email: 'admin@example.com',
        password: '$2b$10$dP.ZXZcHmHxk8BtHhv4Dve3k27QXuSYbKA.P/K9n8xABSb4NBnMs.', // "password"
        displayName: 'Admin',
        isAdmin: true
      });
      
      // Create default user
      await this.createUser({
        email: 'user@example.com',
        password: '$2b$10$dP.ZXZcHmHxk8BtHhv4Dve3k27QXuSYbKA.P/K9n8xABSb4NBnMs.', // "password"
        displayName: 'User',
        isAdmin: false
      });
    }

    // Check if OpenAI provider exists
    const openaiProviders = await db.select().from(providers).where(eq(providers.type, 'openai'));
    
    if (openaiProviders.length === 0) {
      // Create default provider
      await this.createProvider({
        name: 'OpenAI',
        type: 'openai',
        apiKey: process.env.OPENAI_API_KEY || 'sk-your-api-key',
        apiEndpoint: null,
        description: 'OpenAI GPT-4o',
        isActive: true
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return result[0];
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<User> {
    // Ensure email is lowercase
    const data = {
      ...userData,
      email: userData.email.toLowerCase()
    };
    
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const result = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error('User not found');
    }
    
    return result[0];
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.id);
  }

  // Provider methods
  async getProvider(id: string): Promise<Provider | undefined> {
    const result = await db.select().from(providers).where(eq(providers.id, id));
    return result[0];
  }

  async getAllProviders(): Promise<Provider[]> {
    return db.select().from(providers).orderBy(providers.name);
  }

  async getActiveProvider(): Promise<Provider | undefined> {
    const result = await db.select().from(providers).where(eq(providers.isActive, true));
    return result[0];
  }

  async createProvider(providerData: Omit<Provider, 'id' | 'createdAt'>): Promise<Provider> {
    const id = randomUUID();
    const result = await db.insert(providers)
      .values({
        ...providerData,
        id
      })
      .returning();
    
    return result[0];
  }

  async updateProvider(id: string, data: Partial<Provider>): Promise<Provider> {
    const result = await db.update(providers)
      .set(data)
      .where(eq(providers.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Provider not found');
    }
    
    return result[0];
  }

  async deleteProvider(id: string): Promise<void> {
    await db.delete(providers).where(eq(providers.id, id));
  }

  async activateProvider(id: string): Promise<Provider> {
    // First, deactivate all providers
    await db.update(providers)
      .set({ isActive: false })
      .where(sql`1=1`);
    
    // Then, activate the specified provider
    const result = await db.update(providers)
      .set({ isActive: true })
      .where(eq(providers.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Provider not found');
    }
    
    return result[0];
  }

  // Game methods
  async getGame(id: string): Promise<Game | undefined> {
    // Get base game info
    const gameResult = await db.select().from(games).where(eq(games.id, id));
    if (gameResult.length === 0) {
      return undefined;
    }
    
    const game = gameResult[0];
    
    // Get questions
    const questionsResult = await db.select().from(questions).where(eq(questions.gameId, id));
    
    // Get groups
    const groupsResult = await db.select().from(groups).where(eq(groups.gameId, id));
    
    // For each group, get players and board cells
    const groupsWithDetails = await Promise.all(groupsResult.map(async (group) => {
      const playersResult = await db.select().from(players).where(eq(players.groupId, group.id));
      const boardCellsResult = await db.select().from(boardCells).where(eq(boardCells.groupId, group.id));
      
      // Parse bingoPattern if it exists
      let bingoPattern;
      if (group.bingoPattern) {
        try {
          bingoPattern = JSON.parse(group.bingoPattern);
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      return {
        ...group,
        players: playersResult,
        board: boardCellsResult,
        bingoPattern
      };
    }));
    
    // Find current question (most recent one with used=true)
    const currentQuestionResult = await db.select()
      .from(questions)
      .where(and(
        eq(questions.gameId, id),
        eq(questions.used, true)
      ))
      .orderBy(desc(questions.id))
      .limit(1);
    
    const currentQuestion = currentQuestionResult.length > 0 ? {
      id: currentQuestionResult[0].id,
      question: currentQuestionResult[0].question,
      timeLimit: game.answerTime
    } : undefined;
    
    // Build complete game object
    return {
      ...game,
      questions: questionsResult,
      groups: groupsWithDetails,
      currentQuestion
    };
  }

  async getUserGames(userId: number): Promise<any[]> {
    return db.select({
      id: games.id,
      name: games.name,
      creatorId: games.creatorId,
      boardSize: games.boardSize,
      cellSize: games.cellSize,
      answerTime: games.answerTime,
      groupCount: games.groupCount,
      status: games.status,
      createdAt: games.createdAt
    })
    .from(games)
    .where(eq(games.creatorId, userId))
    .orderBy(desc(games.createdAt));
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
    // Create transaction
    return await db.transaction(async (tx) => {
      // Create game
      const gameId = randomUUID();
      const [gameRecord] = await tx.insert(games).values({
        id: gameId,
        name: data.name,
        creatorId: data.creatorId,
        boardSize: data.boardSize,
        cellSize: data.cellSize,
        answerTime: data.answerTime,
        groupCount: data.groupCount,
        status: 'waiting'
      }).returning();
      
      // Create questions
      const questionsToInsert = data.questions.map(q => ({
        id: randomUUID(),
        gameId,
        question: q.question,
        answer: q.answer,
        used: false
      }));
      
      const questionRecords = await tx.insert(questions)
        .values(questionsToInsert)
        .returning();
      
      // Create groups and boards
      const groupsWithBoards = [];
      
      for (let i = 0; i < data.groupCount; i++) {
        const groupId = randomUUID();
        const groupName = `Group ${i + 1}`;
        
        // Create group
        const [groupRecord] = await tx.insert(groups).values({
          id: groupId,
          gameId,
          name: groupName,
          hasBingo: false
        }).returning();
        
        // Create board with positions and random questions
        const positions = createPositionGrid(data.boardSize);
        const shuffledQuestions = shuffleArray([...questionRecords]);
        
        const boardCellsToInsert = positions.map((position, index) => {
          const question = shuffledQuestions[index % shuffledQuestions.length];
          return {
            id: randomUUID(),
            groupId,
            position,
            content: question.answer,
            answer: question.question,
            correct: false
          };
        });
        
        const boardRecords = await tx.insert(boardCells)
          .values(boardCellsToInsert)
          .returning();
        
        groupsWithBoards.push({
          ...groupRecord,
          players: [],
          board: boardRecords,
          hasBingo: false
        });
      }
      
      // Build complete game object
      return {
        ...gameRecord,
        questions: questionRecords,
        groups: groupsWithBoards
      };
    });
  }

  async updateGameStatus(gameId: string, status: 'waiting' | 'active' | 'completed'): Promise<void> {
    const updates: any = { status };
    
    // If status is completed, set completedAt
    if (status === 'completed') {
      updates.completedAt = new Date();
    }
    
    await db.update(games)
      .set(updates)
      .where(eq(games.id, gameId));
  }

  async addPlayerToGame(gameId: string, playerName: string): Promise<{
    playerId: string;
    groupId: string;
    groupName: string;
  }> {
    // Check if game exists and is in waiting state
    const gameResult = await db.select().from(games).where(eq(games.id, gameId));
    
    if (gameResult.length === 0) {
      throw new Error('Game not found');
    }
    
    if (gameResult[0].status !== 'waiting') {
      throw new Error('Game has already started or ended');
    }
    
    // Get all groups for this game
    const groupsResult = await db.select().from(groups).where(eq(groups.gameId, gameId));
    
    // Find group with least players
    let minPlayersGroup = groupsResult[0];
    let minPlayerCount = Infinity;
    
    for (const group of groupsResult) {
      const playersCount = await db.select({ count: sql`count(*)` })
        .from(players)
        .where(eq(players.groupId, group.id));
      
      const count = Number(playersCount[0].count);
      
      if (count < minPlayerCount) {
        minPlayerCount = count;
        minPlayersGroup = group;
      }
    }
    
    // Create player
    const playerId = randomUUID();
    await db.insert(players).values({
      id: playerId,
      groupId: minPlayersGroup.id,
      name: playerName
    });
    
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
    // Get game
    const gameResult = await db.select().from(games).where(eq(games.id, gameId));
    
    if (gameResult.length === 0) {
      throw new Error('Game not found');
    }
    
    const game = gameResult[0];
    
    // Find unused question
    const unusedQuestionResult = await db.select()
      .from(questions)
      .where(and(
        eq(questions.gameId, gameId),
        eq(questions.used, false)
      ))
      .limit(1);
    
    if (unusedQuestionResult.length === 0) {
      return null;
    }
    
    const unusedQuestion = unusedQuestionResult[0];
    
    // Mark question as used
    await db.update(questions)
      .set({ used: true })
      .where(eq(questions.id, unusedQuestion.id));
    
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
    // Since we don't have a separate current_question table, 
    // this is handled by marking questions as used
    // The most recently used question is the current one
    await db.update(questions)
      .set({ used: true })
      .where(eq(questions.id, question.id));
  }

  async recordPlayerAnswer(gameId: string, playerId: string, groupId: string, cellId: string): Promise<void> {
    // Find cell by ID
    const cellIdParts = cellId.split('-');
    if (cellIdParts.length !== 2) {
      throw new Error('Invalid cell ID format');
    }
    
    const position = cellIdParts[1];
    
    // Get current question
    const currentQuestionResult = await db.select()
      .from(questions)
      .where(and(
        eq(questions.gameId, gameId),
        eq(questions.used, true)
      ))
      .orderBy(desc(questions.id))
      .limit(1);
    
    if (currentQuestionResult.length === 0) {
      throw new Error('No current question found');
    }
    
    const questionId = currentQuestionResult[0].id;
    
    // Check if answer already exists
    const existingAnswerResult = await db.select()
      .from(playerAnswers)
      .where(and(
        eq(playerAnswers.gameId, gameId),
        eq(playerAnswers.questionId, questionId),
        eq(playerAnswers.playerId, playerId)
      ));
    
    if (existingAnswerResult.length > 0) {
      // Update existing answer
      await db.update(playerAnswers)
        .set({
          groupId,
          cellId,
          position,
          timestamp: new Date()
        })
        .where(eq(playerAnswers.id, existingAnswerResult[0].id));
    } else {
      // Create new answer
      await db.insert(playerAnswers).values({
        gameId,
        questionId,
        playerId,
        groupId,
        cellId,
        position
      });
    }
  }

  async getGroupAnswers(gameId: string, groupId: string): Promise<PlayerAnswer[]> {
    // Get current question
    const currentQuestionResult = await db.select()
      .from(questions)
      .where(and(
        eq(questions.gameId, gameId),
        eq(questions.used, true)
      ))
      .orderBy(desc(questions.id))
      .limit(1);
    
    if (currentQuestionResult.length === 0) {
      return [];
    }
    
    const questionId = currentQuestionResult[0].id;
    
    // Get answers for this group and question
    return db.select()
      .from(playerAnswers)
      .where(and(
        eq(playerAnswers.gameId, gameId),
        eq(playerAnswers.questionId, questionId),
        eq(playerAnswers.groupId, groupId)
      ));
  }

  async setGroupAnswer(gameId: string, groupId: string, cellId: string): Promise<void> {
    // Find cell by ID
    const cellIdParts = cellId.split('-');
    if (cellIdParts.length !== 2) {
      throw new Error('Invalid cell ID format');
    }
    
    const position = cellIdParts[1];
    
    // Get the cell
    const cellResult = await db.select()
      .from(boardCells)
      .where(and(
        eq(boardCells.groupId, groupId),
        eq(boardCells.position, position)
      ));
    
    if (cellResult.length === 0) {
      throw new Error('Cell not found');
    }
    
    // Get current question
    const currentQuestionResult = await db.select()
      .from(questions)
      .where(and(
        eq(questions.gameId, gameId),
        eq(questions.used, true)
      ))
      .orderBy(desc(questions.id))
      .limit(1);
    
    if (currentQuestionResult.length === 0) {
      throw new Error('No current question found');
    }
    
    // Check if the answer is correct
    const isCorrect = cellResult[0].answer === currentQuestionResult[0].question;
    
    // Update cell
    await db.update(boardCells)
      .set({ correct: isCorrect })
      .where(eq(boardCells.id, cellResult[0].id));
  }

  async getGroupCorrectAnswers(gameId: string, groupId: string): Promise<Array<{
    position: string;
    content: string;
  }>> {
    return db.select({
      position: boardCells.position,
      content: boardCells.content
    })
    .from(boardCells)
    .where(and(
      eq(boardCells.groupId, groupId),
      eq(boardCells.correct, true)
    ));
  }

  async setGroupBingo(gameId: string, groupId: string, pattern: string[]): Promise<void> {
    await db.update(groups)
      .set({
        hasBingo: true,
        bingoPattern: JSON.stringify(pattern)
      })
      .where(eq(groups.id, groupId));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalGames: number;
    activeGames: number;
    apiProviders: number;
  }> {
    const totalUsersResult = await db.select({ count: sql`count(*)` }).from(users);
    const totalGamesResult = await db.select({ count: sql`count(*)` }).from(games);
    const activeGamesResult = await db.select({ count: sql`count(*)` })
      .from(games)
      .where(eq(games.status, 'active'));
    const apiProvidersResult = await db.select({ count: sql`count(*)` }).from(providers);
    
    return {
      totalUsers: Number(totalUsersResult[0].count),
      totalGames: Number(totalGamesResult[0].count),
      activeGames: Number(activeGamesResult[0].count),
      apiProviders: Number(apiProvidersResult[0].count)
    };
  }
}