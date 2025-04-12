import { Request, Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { storage } from '../storage';
import { generateAIQuestions } from '../services/aiService';
import { gameSettingsSchema } from '@shared/types';
import { z } from 'zod';
import { shuffleArray, checkBingoPattern, createPositionGrid } from '../../client/src/lib/utils';

// Game connections
const gameConnections = new Map<string, Map<string, WebSocket>>();

// Handle WebSocket connection
export function handleWebSocketConnection(ws: WebSocket, path: string, wss: WebSocketServer) {
  try {
    // Parse path to extract gameId and playerId (if present)
    const gameMatch = path.match(/\/game\/([^\/]+)(\/player\/([^\/]+))?/);
    if (!gameMatch) {
      ws.close(1008, 'Invalid path');
      return;
    }

    const gameId = gameMatch[1];
    const playerId = gameMatch[3] || 'host';
    const connectionId = `${gameId}:${playerId}`;

    // Store connection
    if (!gameConnections.has(gameId)) {
      console.log(`[WS CONNECT] Creating new connection map for game: ${gameId}`);
      gameConnections.set(gameId, new Map());
    }
    
    // Check if this connection already exists
    const existingConnection = gameConnections.get(gameId)?.get(playerId);
    if (existingConnection) {
      console.log(`[WS CONNECT] Replacing existing connection for: ${connectionId}`);
    }
    
    gameConnections.get(gameId)?.set(playerId, ws);
    
    // Log all connections for this game
    const connections = gameConnections.get(gameId);
    const connectedClients = connections ? Array.from(connections.keys()).join(', ') : 'none';
    console.log(`[WS CONNECT] WebSocket connected: ${connectionId}`);
    console.log(`[WS CONNECT] Connected clients for game ${gameId}: ${connectedClients}`);

    // Handle messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`Received message from ${connectionId}:`, data.type);

        switch (data.type) {
          case 'start_game':
            await handleStartGame(gameId);
            break;
          case 'end_game':
            await handleEndGame(gameId);
            break;
          case 'next_question':
            await handleNextQuestion(gameId);
            break;
          case 'select_answer':
            await handleSelectAnswer(gameId, data.playerId, data.cellId);
            break;
          case 'host_selected':
            await handleHostSelection(gameId, data.cellId, data.position, data.timeLimit);
            break;
          case 'reveal_answer':
            await handleRevealAnswer(gameId, data.cellId, data.position);
            break;
          case 'answer_select':
            await handlePlayerAnswer(gameId, data.playerId, data.cellId, data.position);
            break;
          default:
            console.warn(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error(`Error handling message for ${connectionId}:`, error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`WebSocket disconnected: ${connectionId}`);
      gameConnections.get(gameId)?.delete(playerId);
      
      // Clean up empty game connections
      if (gameConnections.get(gameId)?.size === 0) {
        gameConnections.delete(gameId);
      }
    });

    // Send initial game state if needed
    sendGameUpdate(gameId);
  } catch (error) {
    console.error('Error handling WebSocket connection:', error);
    ws.close(1011, 'Something went wrong');
  }
}

// Send game update to all connected clients
async function sendGameUpdate(gameId: string) {
  try {
    const game = await storage.getGame(gameId);
    if (!game) {
      console.log(`[GAME UPDATE] No game found with ID: ${gameId}`);
      return;
    }

    const connections = gameConnections.get(gameId);
    if (!connections) {
      console.log(`[GAME UPDATE] No connections found for game: ${gameId}`);
      return;
    }

    console.log(`[GAME UPDATE] Sending update for game: ${gameId}, status: ${game.status}, connections: ${connections.size}`);
    
    // Prepare host update
    const hostUpdate = {
      type: 'game_update',
      game: {
        id: game.id,
        name: game.name,
        status: game.status,
        boardSize: game.boardSize,
        cellSize: game.cellSize,
        answerTime: game.answerTime,
        groupCount: game.groupCount,
        currentQuestion: game.currentQuestion,
        groups: game.groups,
      },
    };

    // Send update to host
    const hostConnection = connections.get('host');
    if (hostConnection && hostConnection.readyState === WebSocket.OPEN) {
      console.log(`[GAME UPDATE] Sending update to host for game: ${gameId}`);
      hostConnection.send(JSON.stringify(hostUpdate));
    } else if (hostConnection) {
      console.log(`[GAME UPDATE] Host connection exists but not open, state: ${hostConnection.readyState}`);
    } else {
      console.log(`[GAME UPDATE] No host connection found for game: ${gameId}`);
    }

    // Send updates to players
    for (const [playerId, connection] of connections.entries()) {
      if (playerId === 'host' || connection.readyState !== WebSocket.OPEN) continue;

      // Find player's group
      const playerGroup = game.groups.find(group => 
        group.players.some(player => player.id === playerId)
      );

      if (playerGroup) {
        const playerUpdate = {
          type: 'game_update',
          game: {
            id: game.id,
            name: game.name,
            status: game.status,
            boardSize: game.boardSize,
            cellSize: game.cellSize,
            currentQuestion: game.currentQuestion,
            currentGroup: playerGroup,
          },
        };
        connection.send(JSON.stringify(playerUpdate));
      }
    }
  } catch (error) {
    console.error('Error sending game update:', error);
  }
}

// Handle start game
async function handleStartGame(gameId: string) {
  try {
    const game = await storage.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'waiting') throw new Error('Game is not in waiting state');

    // Update game status
    await storage.updateGameStatus(gameId, 'active');

    // Notify all clients
    sendGameUpdate(gameId);
  } catch (error) {
    console.error('Error starting game:', error);
    throw error;
  }
}

// Handle end game
async function handleEndGame(gameId: string) {
  try {
    const game = await storage.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'active') throw new Error('Game is not active');

    // Update game status
    await storage.updateGameStatus(gameId, 'completed');

    // Notify all clients
    sendGameUpdate(gameId);

    // Send game_over message
    const connections = gameConnections.get(gameId);
    if (connections) {
      for (const [_, connection] of connections.entries()) {
        if (connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify({
            type: 'game_over',
            message: 'The game has ended',
          }));
        }
      }
    }
  } catch (error) {
    console.error('Error ending game:', error);
    throw error;
  }
}

// Handle next question
async function handleNextQuestion(gameId: string) {
  try {
    const game = await storage.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'active') throw new Error('Game is not active');

    // Get next question
    const nextQuestion = await storage.getNextQuestion(gameId);
    if (!nextQuestion) {
      // No more questions, end the game
      await storage.updateGameStatus(gameId, 'completed');
      
      // Notify all clients
      sendGameUpdate(gameId);
      
      // Send game_over message
      const connections = gameConnections.get(gameId);
      if (connections) {
        for (const [_, connection] of connections.entries()) {
          if (connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify({
              type: 'game_over',
              message: 'All questions have been answered',
            }));
          }
        }
      }
      
      return;
    }

    // Update current question
    await storage.updateCurrentQuestion(gameId, nextQuestion);

    // Notify all clients
    sendGameUpdate(gameId);
  } catch (error) {
    console.error('Error getting next question:', error);
    throw error;
  }
}

// Handle select answer
async function handleSelectAnswer(gameId: string, playerId: string, cellId: string) {
  try {
    // Validate inputs
    if (!gameId || !playerId || !cellId) {
      throw new Error('Invalid input: gameId, playerId, and cellId are required');
    }

    const game = await storage.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'active') throw new Error('Game is not active');

    // Find player's group
    const playerGroup = game.groups.find(group => 
      group.players.some(player => player.id === playerId)
    );

    if (!playerGroup) {
      throw new Error('Player not found in any group');
    }

    // Record player's answer
    await storage.recordPlayerAnswer(gameId, playerId, playerGroup.id, cellId);

    // Check for group consensus
    await checkGroupConsensus(gameId, playerGroup.id);

    // Update game state for all clients
    sendGameUpdate(gameId);
  } catch (error) {
    console.error('Error selecting answer:', error);
    throw error;
  }
}

// Check for group consensus on answers
async function checkGroupConsensus(gameId: string, groupId: string) {
  try {
    const game = await storage.getGame(gameId);
    if (!game) return;

    const group = game.groups.find(g => g.id === groupId);
    if (!group) return;

    // Get answers from all players in the group
    const playerAnswers = await storage.getGroupAnswers(gameId, groupId);
    if (!playerAnswers || playerAnswers.length === 0) return;

    // Count answers by cellId
    const answerCounts = new Map<string, number>();
    for (const answer of playerAnswers) {
      const count = answerCounts.get(answer.cellId) || 0;
      answerCounts.set(answer.cellId, count + 1);
    }

    // Find most common answer
    let mostCommonAnswer = '';
    let highestCount = 0;

    for (const [cellId, count] of answerCounts.entries()) {
      if (count > highestCount) {
        mostCommonAnswer = cellId;
        highestCount = count;
      }
    }

    // If there's a consensus, update group answer
    if (mostCommonAnswer) {
      await storage.setGroupAnswer(gameId, groupId, mostCommonAnswer);
      
      // Check if group has achieved Bingo
      const correctAnswers = await storage.getGroupCorrectAnswers(gameId, groupId);
      if (correctAnswers.length >= game.boardSize) { // Need at least boardSize correct answers to check for Bingo
        const bingoPattern = checkBingoPattern(correctAnswers.map(a => a.position), game.boardSize);
        
        if (bingoPattern) {
          await storage.setGroupBingo(gameId, groupId, bingoPattern);
          
          // Notify all clients about Bingo achievement
          const connections = gameConnections.get(gameId);
          if (connections) {
            const bingoMessage = JSON.stringify({
              type: 'bingo_achieved',
              groupId,
              groupName: group.name,
              members: group.players,
              pattern: bingoPattern,
              boardSize: game.boardSize
            });
            
            for (const [_, connection] of connections.entries()) {
              if (connection.readyState === WebSocket.OPEN) {
                connection.send(bingoMessage);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking group consensus:', error);
  }
}

// Track active player answers for each game
const gameAnswers = new Map<string, Map<string, Map<string, string>>>(); // gameId -> groupId -> playerId -> cellId

// Handle host selection of a cell
async function handleHostSelection(gameId: string, cellId: string, position: string, timeLimit: number) {
  try {
    console.log(`[HOST SELECTION] Host selected cell ${cellId} in game ${gameId}`);
    
    const game = await storage.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'active') throw new Error('Game is not active');
    
    // Find the cell data in any of the group boards
    let selectedCellData = null;
    for (const group of game.groups) {
      const foundCell = group.board.find(cell => cell.position === position);
      if (foundCell) {
        selectedCellData = foundCell;
        break;
      }
    }
    
    if (!selectedCellData) {
      console.error(`Cell with position ${position} not found in any group board`);
    }
    
    // Get the current question
    const currentQuestion = game.currentQuestion || null;
    
    // Clear previous answer tracking for this game
    if (!gameAnswers.has(gameId)) {
      gameAnswers.set(gameId, new Map());
    }
    
    // Reset answer tracking for all groups in this game
    for (const group of game.groups) {
      if (!gameAnswers.get(gameId)?.has(group.id)) {
        gameAnswers.get(gameId)?.set(group.id, new Map());
      } else {
        gameAnswers.get(gameId)?.get(group.id)?.clear();
      }
    }
    
    // Send message to all players that host has selected a cell
    const connections = gameConnections.get(gameId);
    if (!connections) return;
    
    for (const [playerId, connection] of connections.entries()) {
      if (connection.readyState === WebSocket.OPEN && playerId !== 'host') {
        // Find the player's group
        let playerGroup = null;
        for (const group of game.groups) {
          if (group.players.some(player => player.id === playerId)) {
            playerGroup = group;
            break;
          }
        }
        
        // If we found the player's group, find their specific board cell
        let playerCell = null;
        if (playerGroup) {
          playerCell = playerGroup.board.find(cell => cell.position === position);
        }
        
        // Send the message with additional data
        connection.send(JSON.stringify({
          type: 'host_selected',
          cellId,
          position,
          timeLimit,
          content: playerCell ? playerCell.content : '',
          question: currentQuestion
        }));
      }
    }
    
    // Start a timer for answer time
    setTimeout(async () => {
      // Time's up - automatically reveal the answer
      await handleRevealAnswer(gameId, cellId, position);
    }, timeLimit * 1000);
    
  } catch (error) {
    console.error('Error handling host selection:', error);
  }
}

// Handle player submitting an answer
async function handlePlayerAnswer(gameId: string, playerId: string, cellId: string, position: string) {
  try {
    console.log(`[PLAYER ANSWER] Player ${playerId} selected ${cellId} in game ${gameId}`);
    
    const game = await storage.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'active') throw new Error('Game is not active');
    
    // Find player's group
    const playerGroup = game.groups.find(group => 
      group.players.some(player => player.id === playerId)
    );
    
    if (!playerGroup) {
      throw new Error('Player not found in any group');
    }
    
    // Record player's answer in memory
    if (!gameAnswers.has(gameId)) {
      gameAnswers.set(gameId, new Map());
    }
    
    if (!gameAnswers.get(gameId)?.has(playerGroup.id)) {
      gameAnswers.get(gameId)?.set(playerGroup.id, new Map());
    }
    
    gameAnswers.get(gameId)?.get(playerGroup.id)?.set(playerId, cellId);
    
    // Count votes for each option in this group
    const groupAnswers = gameAnswers.get(gameId)?.get(playerGroup.id);
    const answerCounts = new Map<string, number>();
    const voterMap = new Map<string, string[]>(); // cellId -> playerIds
    
    if (groupAnswers) {
      for (const [pid, cid] of groupAnswers.entries()) {
        // Count votes
        const count = answerCounts.get(cid) || 0;
        answerCounts.set(cid, count + 1);
        
        // Track voters
        if (!voterMap.has(cid)) {
          voterMap.set(cid, []);
        }
        voterMap.get(cid)?.push(pid);
      }
    }
    
    // Create answer options with vote counts and voters
    const answerOptions = Array.from(answerCounts.entries()).map(([cellId, votes]) => {
      const cell = game.groups
        .flatMap(g => g.board)
        .find(c => c.position === position);

      return {
        id: cellId,
        position,
        content: cell?.content || '',
        votes,
        voters: voterMap.get(cellId) || []
      };
    });
    
    // Update all players in the group about vote status
    const connections = gameConnections.get(gameId);
    if (!connections) return;
    
    // Send updated vote counts to all players in this group
    for (const player of playerGroup.players) {
      const connection = connections.get(player.id);
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify({
          type: 'player_vote',
          playerId,
          cellId,
          options: answerOptions
        }));
      }
    }
    
    // Also send to the host
    const hostConnection = connections.get('host');
    if (hostConnection && hostConnection.readyState === WebSocket.OPEN) {
      hostConnection.send(JSON.stringify({
        type: 'player_vote',
        groupId: playerGroup.id,
        playerId,
        cellId,
        options: answerOptions
      }));
    }
    
  } catch (error) {
    console.error('Error handling player answer:', error);
  }
}

// Handle revealing the answer after answer time expires
async function handleRevealAnswer(gameId: string, cellId: string, position: string) {
  try {
    console.log(`[REVEAL ANSWER] Revealing answer for cell ${cellId} in game ${gameId}`);
    
    const game = await storage.getGame(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'active') throw new Error('Game is not active');
    
    // Process answers for each group
    for (const group of game.groups) {
      const groupAnswers = gameAnswers.get(gameId)?.get(group.id);
      if (!groupAnswers || groupAnswers.size === 0) continue;
      
      // Count answers to find consensus
      const answerCounts = new Map<string, number>();
      let mostCommonAnswer = '';
      let highestCount = 0;
      let earliestTimestamp = Infinity;
      
      // Use in-memory answer tracking
      for (const [_, cellId] of groupAnswers.entries()) {
        const count = answerCounts.get(cellId) || 0;
        answerCounts.set(cellId, count + 1);
        
        // If this answer has more votes, or the same votes but came first
        if (count + 1 > highestCount) {
          mostCommonAnswer = cellId;
          highestCount = count + 1;
        }
      }
      
      // Record consensus answer
      if (mostCommonAnswer) {
        await storage.recordPlayerAnswer(gameId, 'group', group.id, mostCommonAnswer);
        await storage.setGroupAnswer(gameId, group.id, mostCommonAnswer);
        
        // Check for Bingo after answer is recorded
        const correctAnswers = await storage.getGroupCorrectAnswers(gameId, group.id);
        if (correctAnswers.length >= game.boardSize) {
          const bingoPattern = checkBingoPattern(correctAnswers.map(a => a.position), game.boardSize);
          
          if (bingoPattern) {
            await storage.setGroupBingo(gameId, group.id, bingoPattern);
            
            // Notify all clients about Bingo achievement
            const connections = gameConnections.get(gameId);
            if (connections) {
              const bingoMessage = JSON.stringify({
                type: 'bingo_achieved',
                groupId: group.id,
                groupName: group.name,
                members: group.players,
                pattern: bingoPattern,
                boardSize: game.boardSize
              });
              
              for (const [_, connection] of connections.entries()) {
                if (connection.readyState === WebSocket.OPEN) {
                  connection.send(bingoMessage);
                }
              }
            }
          }
        }
      }
    }
    
    // Clear answers for this question
    gameAnswers.get(gameId)?.clear();
    
    // Update game state for all clients
    sendGameUpdate(gameId);
    
  } catch (error) {
    console.error('Error revealing answer:', error);
  }
}

// Get recent games controller
export async function getRecentGames(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const games = await storage.getUserGames(userId);
    return res.status(200).json(games);
  } catch (error) {
    console.error('Error getting recent games:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Create game controller
export async function createGame(req: Request, res: Response) {
  try {
    // Validate user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Validate settings
    const settingsResult = gameSettingsSchema.safeParse(req.body.settings);
    if (!settingsResult.success) {
      return res.status(400).json({ message: 'Invalid game settings' });
    }

    // Validate questions
    const questionsSchema = z.array(z.object({
      question: z.string().min(1),
      answer: z.string().min(1)
    }));
    
    const questionsResult = questionsSchema.safeParse(req.body.questions);
    if (!questionsResult.success) {
      return res.status(400).json({ message: 'Invalid questions' });
    }

    // Need enough questions for the board
    const boardSize = settingsResult.data.boardSize;
    const minQuestions = boardSize * boardSize;
    
    if (questionsResult.data.length < minQuestions) {
      return res.status(400).json({ 
        message: `Not enough questions. Need at least ${minQuestions} for a ${boardSize}x${boardSize} board.`
      });
    }

    // Create game
    const gameData = {
      name: settingsResult.data.name,
      creatorId: userId,
      boardSize: settingsResult.data.boardSize,
      cellSize: settingsResult.data.cellSize,
      answerTime: settingsResult.data.answerTime,
      groupCount: settingsResult.data.groupCount,
      questions: questionsResult.data,
    };

    const game = await storage.createGame(gameData);

    return res.status(201).json({ 
      id: game.id,
      name: game.name,
      boardSize: game.boardSize,
      cellSize: game.cellSize,
      answerTime: game.answerTime,
      groupCount: game.groupCount,
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get game controller
export async function getGame(req: Request, res: Response) {
  try {
    const { gameId } = req.params;
    
    const game = await storage.getGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Return minimal info for non-authenticated users
    return res.status(200).json({
      id: game.id,
      name: game.name,
      status: game.status,
      boardSize: game.boardSize,
      cellSize: game.cellSize,
      groupCount: game.groupCount,
    });
  } catch (error) {
    console.error('Error getting game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get game for host controller
export async function getGameForHost(req: Request, res: Response) {
  try {
    const { gameId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const game = await storage.getGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Verify that the user is the creator of the game
    if (game.creatorId !== userId) {
      return res.status(403).json({ message: 'Not authorized to host this game' });
    }

    // Return full game info for the host
    return res.status(200).json(game);
  } catch (error) {
    console.error('Error getting game for host:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Get game for player controller
export async function getGameForPlayer(req: Request, res: Response) {
  try {
    const { gameId, playerId } = req.params;
    
    const game = await storage.getGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Find player's group
    let playerGroup = null;
    for (const group of game.groups) {
      if (group.players.some(player => player.id === playerId)) {
        playerGroup = group;
        break;
      }
    }

    if (!playerGroup) {
      return res.status(404).json({ message: 'Player not found in this game' });
    }

    // Return game info for the player
    return res.status(200).json({
      id: game.id,
      name: game.name,
      status: game.status,
      boardSize: game.boardSize,
      cellSize: game.cellSize,
      currentQuestion: game.currentQuestion,
      currentGroup: playerGroup,
    });
  } catch (error) {
    console.error('Error getting game for player:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Join game controller
export async function joinGame(req: Request, res: Response) {
  try {
    const { gameId } = req.params;
    const { displayName } = req.body;
    
    if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
      return res.status(400).json({ message: 'Display name is required' });
    }

    const game = await storage.getGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Game has already started or ended' });
    }

    // Add player to the game (will be assigned to a group)
    const result = await storage.addPlayerToGame(gameId, displayName.trim());
    
    // Create message for player joined event
    const playerJoinedMessage = JSON.stringify({
      type: 'player_joined',
      playerId: result.playerId,
      playerName: displayName.trim(),
      groupId: result.groupId,
      groupName: result.groupName
    });
    
    // DEBUG: Log connections info
    console.log(`[JOIN GAME] GameID: ${gameId}, New player: ${displayName.trim()}`);
    
    // Notify all connected clients about the new player
    const connections = gameConnections.get(gameId);
    if (connections) {
      console.log(`[JOIN GAME] Number of connections for game ${gameId}: ${connections.size}`);
      
      // Send to all connected clients
      for (const [clientId, connection] of connections.entries()) {
        if (connection.readyState === WebSocket.OPEN) {
          console.log(`[JOIN GAME] Sending player_joined to client: ${clientId}`);
          connection.send(playerJoinedMessage);
        } else {
          console.log(`[JOIN GAME] Connection not open for client: ${clientId}, state: ${connection.readyState}`);
        }
      }
    } else {
      console.log(`[JOIN GAME] No connections found for game ${gameId}`);
    }
    
    // Also send a full game update to all clients
    await sendGameUpdate(gameId);

    return res.status(200).json({
      playerId: result.playerId,
      groupId: result.groupId,
      groupName: result.groupName
    });
  } catch (error) {
    console.error('Error joining game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Start game controller
export async function startGame(req: Request, res: Response) {
  try {
    const { gameId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const game = await storage.getGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Verify that the user is the creator of the game
    if (game.creatorId !== userId) {
      return res.status(403).json({ message: 'Not authorized to start this game' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Game has already started or ended' });
    }

    // Start the game
    await storage.updateGameStatus(gameId, 'active');
    
    // Update all connected clients
    sendGameUpdate(gameId);

    return res.status(200).json({ message: 'Game started successfully' });
  } catch (error) {
    console.error('Error starting game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// End game controller
export async function endGame(req: Request, res: Response) {
  try {
    const { gameId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const game = await storage.getGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Verify that the user is the creator of the game
    if (game.creatorId !== userId) {
      return res.status(403).json({ message: 'Not authorized to end this game' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Game is not active' });
    }

    // End the game
    await storage.updateGameStatus(gameId, 'completed');
    
    // Update all connected clients
    sendGameUpdate(gameId);
    
    // Send game_over message
    const connections = gameConnections.get(gameId);
    if (connections) {
      for (const [_, connection] of connections.entries()) {
        if (connection.readyState === WebSocket.OPEN) {
          connection.send(JSON.stringify({
            type: 'game_over',
            message: 'The game has been ended by the host',
          }));
        }
      }
    }

    return res.status(200).json({ message: 'Game ended successfully' });
  } catch (error) {
    console.error('Error ending game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Next question controller
export async function nextQuestion(req: Request, res: Response) {
  try {
    const { gameId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const game = await storage.getGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Verify that the user is the creator of the game
    if (game.creatorId !== userId) {
      return res.status(403).json({ message: 'Not authorized to control this game' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Game is not active' });
    }

    // Get next question
    const nextQuestion = await storage.getNextQuestion(gameId);
    if (!nextQuestion) {
      // No more questions, end the game
      await storage.updateGameStatus(gameId, 'completed');
      
      // Update all connected clients
      sendGameUpdate(gameId);
      
      return res.status(200).json({ message: 'All questions completed, game ended' });
    }

    // Update current question
    await storage.updateCurrentQuestion(gameId, nextQuestion);
    
    // Update all connected clients
    sendGameUpdate(gameId);

    return res.status(200).json({ currentQuestion: nextQuestion });
  } catch (error) {
    console.error('Error getting next question:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Submit answer controller
export async function submitAnswer(req: Request, res: Response) {
  try {
    const { gameId } = req.params;
    const { playerId, cellId } = req.body;
    
    if (!playerId || !cellId) {
      return res.status(400).json({ message: 'Player ID and cell ID are required' });
    }

    const game = await storage.getGame(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ message: 'Game is not active' });
    }

    // Find player's group
    let playerGroupId = null;
    for (const group of game.groups) {
      if (group.players.some(player => player.id === playerId)) {
        playerGroupId = group.id;
        break;
      }
    }

    if (!playerGroupId) {
      return res.status(404).json({ message: 'Player not found in this game' });
    }

    // Record player's answer
    await storage.recordPlayerAnswer(gameId, playerId, playerGroupId, cellId);

    // Check for group consensus
    await checkGroupConsensus(gameId, playerGroupId);

    // Update game state for all clients
    sendGameUpdate(gameId);

    return res.status(200).json({ message: 'Answer submitted successfully' });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Generate questions controller
export async function generateQuestions(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { prompt, count = 25 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // Get active AI provider
    const provider = await storage.getActiveProvider();
    if (!provider) {
      return res.status(400).json({ message: 'No active AI provider configured' });
    }

    // Generate questions
    const questions = await generateAIQuestions(provider, prompt, count);
    
    return res.status(200).json({ questions });
  } catch (error) {
    console.error('Error generating questions:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate questions' });
  }
}
