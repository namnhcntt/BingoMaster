import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckIcon, TimerIcon, XIcon } from 'lucide-react';
import BingoBoard, { BingoBoardCell } from './BingoBoard';
import QuestionDisplay from './QuestionDisplay';
import BingoAchievementModal, { BingoGroupResult } from './BingoAchievementModal';
import { useWebSocket } from '@/hooks/useWebSocket';

export interface GamePlayer {
  id: string;
  name: string;
  avatar?: string;
}

export interface GameGroup {
  id: string;
  name: string;
  players: GamePlayer[];
  hasBingo: boolean;
  bingoPattern?: string[];
}

export interface GameQuestion {
  id: string;
  question: string;
  timeLimit: number;
}

export interface AnswerOption {
  id: string;
  position: string;
  content: string;
  votes: number;
}

interface GamePlayViewProps {
  gameId: string;
  isHost?: boolean;
  currentPlayerId?: string;
  gameData: {
    id: string;
    name: string;
    status: 'waiting' | 'active' | 'completed';
    boardSize: number;
    cellSize: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
    currentGroup?: GameGroup;
  };
  onAnswerSelect?: (cellId: string) => void;
}

export default function GamePlayView({
  gameId,
  isHost = false,
  currentPlayerId,
  gameData,
  onAnswerSelect
}: GamePlayViewProps) {
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [bingoCells, setBingoCells] = useState<BingoBoardCell[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [bingoModal, setBingoModal] = useState<{ show: boolean; result: BingoGroupResult | null }>({
    show: false,
    result: null
  });

  // WebSocket connection
  const { socket, lastMessage, sendMessage, connectionStatus } = useWebSocket(`/ws/game/${gameId}`);

  // Initialize board cells
  useEffect(() => {
    if (gameData && gameData.boardSize) {
      const initialCells: BingoBoardCell[] = [];
      for (let i = 0; i < gameData.boardSize; i++) {
        for (let j = 0; j < gameData.boardSize; j++) {
          const position = `${String.fromCharCode(65 + i)}${j + 1}`;
          initialCells.push({
            id: `cell-${position}`,
            position,
            content: '',
            state: 'default'
          });
        }
      }
      setBingoCells(initialCells);
    }
  }, [gameData]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        switch (data.type) {
          case 'question':
            setCurrentQuestion(data.question);
            setTimeLeft(data.question.timeLimit);
            setAnswerOptions(data.options);
            break;
          
          case 'timer':
            setTimeLeft(data.timeLeft);
            break;
          
          case 'answer_result':
            // Update cell state based on answer result
            setBingoCells(prev => prev.map(cell => {
              if (cell.position === data.position) {
                return {
                  ...cell,
                  content: data.content,
                  state: data.correct ? 'correct' : 'incorrect'
                };
              }
              return cell;
            }));
            break;
          
          case 'bingo_achieved':
            setBingoModal({
              show: true,
              result: {
                groupId: data.groupId,
                groupName: data.groupName,
                members: data.members,
                pattern: data.pattern,
                boardSize: gameData.boardSize
              }
            });
            break;
          
          case 'board_update':
            // Update the entire board state
            setBingoCells(data.cells);
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message', e);
      }
    }
  }, [lastMessage, gameData.boardSize]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || !currentQuestion) return;
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft, currentQuestion]);

  // Handle cell click
  const handleCellClick = (cell: BingoBoardCell) => {
    if (!currentQuestion || !onAnswerSelect) return;
    
    // Toggle selection
    const newCellId = cell.id === selectedCellId ? null : cell.id;
    setSelectedCellId(newCellId);
    
    // Update local board state for visual feedback
    setBingoCells(prev => prev.map(c => {
      if (c.id === cell.id) {
        return {
          ...c,
          state: c.id === selectedCellId ? 'default' : 'selected'
        };
      }
      if (c.id === selectedCellId) {
        return {
          ...c,
          state: 'default'
        };
      }
      return c;
    }));
    
    // Send selection to server
    if (newCellId) {
      onAnswerSelect(cell.id);
      
      if (socket && connectionStatus === 'Open') {
        sendMessage(JSON.stringify({
          type: 'answer_select',
          playerId: currentPlayerId,
          gameId,
          cellId: cell.id,
          position: cell.position
        }));
      }
    }
  };

  // Handle next question (host only)
  const handleNextQuestion = () => {
    if (isHost && socket && connectionStatus === 'Open') {
      sendMessage(JSON.stringify({
        type: 'next_question',
        gameId
      }));
    }
  };

  // Handle end game (host only)
  const handleEndGame = () => {
    if (isHost && socket && connectionStatus === 'Open') {
      sendMessage(JSON.stringify({
        type: 'end_game',
        gameId
      }));
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="bg-primary-100 dark:bg-primary-900 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold font-poppins text-primary-700 dark:text-primary-300">
              {gameData.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {gameData.currentGroup?.name} • {gameData.boardSize}×{gameData.boardSize} Board
            </p>
          </div>
          <div className="flex space-x-3">
            <div className="bg-white dark:bg-gray-700 px-3 py-1 rounded-full flex items-center shadow">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Players:</span>
              <div className="flex -space-x-2">
                {gameData.currentGroup?.players.slice(0, 3).map((player) => (
                  <Avatar key={player.id} className="h-6 w-6 border-2 border-white dark:border-gray-700">
                    <AvatarImage src={player.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${player.name}`} alt={player.name} />
                    <AvatarFallback>{player.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
                {gameData.currentGroup?.players.length > 3 && (
                  <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-600 text-xs font-medium text-white border-2 border-white dark:border-gray-700">
                    +{gameData.currentGroup.players.length - 3}
                  </div>
                )}
              </div>
            </div>
            
            <Badge variant={gameData.status === 'active' ? 'default' : gameData.status === 'waiting' ? 'outline' : 'secondary'} className="flex items-center">
              {gameData.status === 'active' ? (
                <>
                  <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Live
                </>
              ) : gameData.status === 'waiting' ? (
                <>Waiting</>
              ) : (
                <>Completed</>
              )}
            </Badge>
          </div>
        </CardHeader>
        
        {/* Current Question Display */}
        {currentQuestion && (
          <div className="p-3 sm:p-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-2 sm:mb-3 flex justify-between items-center">
              <div className="flex items-center">
                <Badge variant="default">Question {currentQuestion.id}</Badge>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className={`countdown-timer ${timeLeft <= 5 ? 'countdown-timer-low' : ''}`}>
                  {timeLeft}
                </div>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">sec</span>
              </div>
            </div>
            
            <div className="max-w-screen-sm mx-auto">
              <QuestionDisplay question={currentQuestion.question} />
            </div>
          </div>
        )}
        
        {/* Game Board with Answers */}
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="max-w-screen-sm mx-auto">
            <BingoBoard
              cells={bingoCells}
              boardSize={gameData.boardSize}
              cellSize={gameData.cellSize}
              animate={true}
              onCellClick={handleCellClick}
              winningPattern={gameData.currentGroup?.bingoPattern}
            />
          </div>
          
          {/* Group Answer Status */}
          {answerOptions.length > 0 && (
            <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 max-w-screen-sm mx-auto">
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Group Consensus</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {answerOptions.map(option => {
                  const totalPlayers = gameData.currentGroup?.players.length || 1;
                  const percentage = (option.votes / totalPlayers) * 100;
                  
                  return (
                    <div key={option.id} className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm text-sm">
                      <div className={`font-game font-medium mb-0.5 text-xs ${
                        option.position === selectedCellId 
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {option.content}
                      </div>
                      <div className="flex items-center">
                        <div className={`h-3 rounded-full flex-1 mr-1 overflow-hidden ${
                          option.position === selectedCellId
                            ? 'bg-primary-100 dark:bg-primary-900'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <div 
                            className={`h-full rounded-full ${
                              option.position === selectedCellId
                                ? 'bg-primary-500'
                                : 'bg-gray-400'
                            }`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium whitespace-nowrap">{option.votes}/{totalPlayers}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Controls for Game Host Only */}
          {isHost && (
            <div className="mt-6 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">You are the game host</span>
              </div>
              <div className="flex space-x-4">
                <Button 
                  variant="outline"
                  className="bg-accent-50 text-accent-700 border-accent-200 hover:bg-accent-100"
                  onClick={handleNextQuestion}
                  disabled={gameData.status !== 'active'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Next Question
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleEndGame}
                  disabled={gameData.status !== 'active'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  End Game
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Bingo Achievement Modal */}
      <BingoAchievementModal
        isOpen={bingoModal.show}
        onClose={() => setBingoModal({ show: false, result: null })}
        result={bingoModal.result}
      />
    </>
  );
}
