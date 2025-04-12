import { useState, useEffect } from 'react';
import { useParams, useLocation, Redirect } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Share2, Copy, AlertCircle, Users, UserPlus } from 'lucide-react';
import GamePlayView from '@/components/game/GamePlayView';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGame } from '@/hooks/useGame';

export default function Host() {
  const { gameId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [gameData, setGameData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState('');

  // Fetch game data
  const { data: initialData, isLoading, error: fetchError } = useQuery({
    queryKey: [`/api/games/${gameId}/host`],
    enabled: !!gameId && !!user,
  });

  // WebSocket connection
  const { socket, lastMessage, sendMessage, connectionStatus } = useWebSocket(
    gameId ? `/ws/game/${gameId}/host` : null
  );

  // Game hooks
  const { startGame, endGame, nextQuestion } = useGame(gameId);

  // Set invite URL
  useEffect(() => {
    if (gameId) {
      // Use full URL with domain for production
      const baseUrl = window.location.origin;
      setInviteUrl(`${baseUrl}/game/join/${gameId}`);
    }
  }, [gameId]);

  // Handle initial data load
  useEffect(() => {
    if (initialData) {
      setGameData(initialData as any);
    }
  }, [initialData]);

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      const errorMessage = typeof fetchError === 'object' && fetchError !== null && 'message' in fetchError 
        ? (fetchError as any).message 
        : 'An unknown error occurred';
      setError(errorMessage);
    }
  }, [fetchError]);

  // Handler for manual refresh
  const { refetch } = useQuery({
    queryKey: [`/api/games/${gameId}/host`],
    enabled: false,
  });

  // Handle websocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        console.log('Received websocket message:', data.type);
        
        // Update game state based on message type
        switch (data.type) {
          case 'game_update':
            console.log('Updating game state from websocket');
            if (data.game) {
              setGameData(data.game as any);
            }
            break;
          
          case 'player_joined':
            toast({
              title: "Player Joined",
              description: `${data.playerName} joined ${data.groupName}`,
            });
            
            // Immediately fetch the latest game data to ensure we have the new player
            console.log('Fetching latest game data after player joined');
            refetch().then(result => {
              if (result.data) {
                console.log('Successfully refetched game data after player joined');
                setGameData(result.data as any);
              }
            });
            break;
          
          case 'error':
            toast({
              title: "Error",
              description: data.message || 'An unknown error occurred',
              variant: "destructive",
            });
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message', e);
      }
    }
  }, [lastMessage, toast, refetch]);

  // Copy invite link
  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    });
  };

  // Handle start game
  const handleStartGame = () => {
    startGame();
  };

  // Handle end game
  const handleEndGame = () => {
    endGame();
  };

  // Handle next question
  const handleNextQuestion = () => {
    nextQuestion();
  };

  // Redirect if not logged in
  if (!user) {
    return <Redirect to="/login" />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Game Not Found</AlertTitle>
          <AlertDescription>
            The game you're trying to host doesn't exist or you don't have permission to access it.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  // Render game host view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{gameData.name}</h1>
        <p className="text-muted-foreground">
          Game host controls and status
        </p>
      </div>

      <Tabs defaultValue="game">
        <TabsList>
          <TabsTrigger value="game">Game</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="invite">Invite</TabsTrigger>
        </TabsList>
        
        {/* Game Tab */}
        <TabsContent value="game" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Game Status: {gameData.status.charAt(0).toUpperCase() + gameData.status.slice(1)}</span>
                <div className="flex space-x-2">
                  {gameData.status === 'waiting' && (
                    <Button onClick={handleStartGame} disabled={gameData.groups?.every(g => g.players.length === 0)}>
                      Start Game
                    </Button>
                  )}
                  {gameData.status === 'active' && (
                    <>
                      <Button variant="outline" onClick={handleNextQuestion}>
                        Next Question
                      </Button>
                      <Button variant="destructive" onClick={handleEndGame}>
                        End Game
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                {gameData.boardSize}x{gameData.boardSize} board • {gameData.groupCount} groups • {gameData.answerTime}s time limit
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gameData.status === 'waiting' ? (
                <div className="text-center p-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-medium mb-2">Waiting for players to join...</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    Share the invite link with players to let them join your game
                  </p>
                  <Button variant="outline" onClick={() => copyInviteLink()}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Invite Link
                  </Button>
                </div>
              ) : (
                <GamePlayView
                  gameId={gameId || ''}
                  isHost={true}
                  gameData={{
                    ...gameData,
                    currentGroup: null // Host doesn't belong to a specific group
                  }}
                  onNextQuestion={handleNextQuestion}
                  onEndGame={handleEndGame}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Players Tab */}
        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>Players ({gameData.groups?.reduce((count, group) => count + group.players.length, 0) || 0})</CardTitle>
              <CardDescription>
                Players are automatically distributed across groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameData.groups?.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-2 flex items-center">
                      {group.name}
                      {group.hasBingo && 
                        <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                          BINGO!
                        </span>
                      }
                    </h3>
                    
                    {group.players.length > 0 ? (
                      <ul className="space-y-2">
                        {group.players.map((player) => (
                          <li key={player.id} className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-800 dark:text-primary-200 font-bold mr-2">
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{player.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-muted-foreground text-sm py-2">No players in this group yet</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Invite Tab */}
        <TabsContent value="invite">
          <Card>
            <CardHeader>
              <CardTitle>Invite Players</CardTitle>
              <CardDescription>
                Share this link with players to invite them to your game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <div className="border rounded-md p-3 flex-grow bg-gray-50 dark:bg-gray-800 truncate">
                  {inviteUrl}
                </div>
                <Button variant="outline" onClick={copyInviteLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              
              <div className="pt-4">
                <h3 className="font-medium mb-2">Share via</h3>
                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    window.open(`mailto:?subject=Join my Bingo game&body=Join my Bingo game: ${inviteUrl}`, '_blank');
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => {
                    window.open(`https://wa.me/?text=Join my Bingo game: ${inviteUrl}`, '_blank');
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 448 512" fill="currentColor">
                      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                    </svg>
                    WhatsApp
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => {
                    navigator.clipboard.writeText(inviteUrl).then(() => {
                      toast({
                        title: "Copied!",
                        description: "Invite link copied to clipboard",
                      });
                    });
                  }}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="w-full flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  <UserPlus className="h-4 w-4 inline mr-1" />
                  {gameData.groups?.reduce((count, group) => count + group.players.length, 0) || 0} players joined
                </div>
                {gameData.status === 'waiting' && gameData.groups?.some(g => g.players.length > 0) && (
                  <Button onClick={handleStartGame}>
                    Start Game
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
