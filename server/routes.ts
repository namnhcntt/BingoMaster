import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authMiddleware, authOptionalMiddleware } from "./middleware/auth";
import * as authController from "./controllers/auth";
import * as gameController from "./controllers/game";
import * as adminController from "./controllers/admin";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket connection handler
  wss.on('connection', (ws, req) => {
    // Extract path from URL (e.g., /ws/game/123)
    const path = req.url?.replace('/ws', '') || '';
    
    // Handle game sockets
    if (path.startsWith('/game/')) {
      gameController.handleWebSocketConnection(ws, path, wss);
    }
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket disconnected');
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Auth Routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/logout', authController.logout);
  app.get('/api/auth/me', authOptionalMiddleware, authController.getCurrentUser);
  
  // Game Routes
  app.get('/api/games/recent', authMiddleware, gameController.getRecentGames);
  app.post('/api/games', authMiddleware, gameController.createGame);
  app.get('/api/games/:gameId', authOptionalMiddleware, gameController.getGame);
  app.get('/api/games/:gameId/host', authMiddleware, gameController.getGameForHost);
  app.get('/api/games/:gameId/player/:playerId', gameController.getGameForPlayer);
  app.post('/api/games/:gameId/join', gameController.joinGame);
  app.post('/api/games/:gameId/start', authMiddleware, gameController.startGame);
  app.post('/api/games/:gameId/end', authMiddleware, gameController.endGame);
  app.post('/api/games/:gameId/next-question', authMiddleware, gameController.nextQuestion);
  app.post('/api/games/:gameId/answer', gameController.submitAnswer);
  
  // AI Content Generation
  app.post('/api/game/generate-questions', authMiddleware, gameController.generateQuestions);
  
  // Admin Routes
  app.get('/api/admin/stats', authMiddleware, adminController.getStats);
  app.get('/api/admin/users', authMiddleware, adminController.getUsers);
  app.post('/api/admin/users', authMiddleware, adminController.createUser);
  app.put('/api/admin/users/:userId', authMiddleware, adminController.updateUser);
  app.delete('/api/admin/users/:userId', authMiddleware, adminController.deleteUser);
  app.post('/api/admin/users/:userId/reset-password', authMiddleware, adminController.resetPassword);
  
  app.get('/api/admin/providers', authMiddleware, adminController.getProviders);
  app.post('/api/admin/providers', authMiddleware, adminController.createProvider);
  app.put('/api/admin/providers/:providerId', authMiddleware, adminController.updateProvider);
  app.delete('/api/admin/providers/:providerId', authMiddleware, adminController.deleteProvider);
  app.post('/api/admin/providers/:providerId/activate', authMiddleware, adminController.activateProvider);
  app.post('/api/admin/providers/:providerId/test', authMiddleware, adminController.testProvider);

  return httpServer;
}
