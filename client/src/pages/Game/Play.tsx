import { useState, useEffect } from 'react';
import { useParams, useLocation, useSearch, Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import GamePlayView from '@/components/game/GamePlayView';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGame } from '@/hooks/useGame';
import { useToast } from '@/hooks/use-toast';

export default function Play() {
  const { gameId } = useParams();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const playerId = params.get('playerId');
  const { toast } = useToast();
  
  // Game state
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get player and game information
  const { data: initialData, isLoading, error: fetchError } = useQuery({
    queryKey: [`/api/games/${gameId}/player/${playerId}`],
    enabled: !!gameId && !!playerId,
  });

  // WebSocket connection
  const { socket, lastMessage, sendMessage, connectionStatus } = useWebSocket(
    gameId && playerId ? `/ws/game/${gameId}/player/${playerId}` : null
  );

  // Game hooks
  const { selectAnswer } = useGame(gameId, playerId);

  // Handle initial data load
  useEffect(() => {
    if (initialData) {
      setGameData(initialData);
    }
  }, [initialData]);

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message);
    }
  }, [fetchError]);

  // Handle websocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // Update game state based on message type
        switch (data.type) {
          case 'game_update':
            setGameData(data.game);
            break;
          
          case 'game_over':
            toast({
              title: "Game Over",
              description: data.message || "The game has ended",
            });
            break;
          
          case 'error':
            toast({
              title: "Error",
              description: data.message,
              variant: "destructive",
            });
            break;
        }
      } catch (e) {
        console.error('Error parsing WebSocket message', e);
      }
    }
  }, [lastMessage, toast]);

  // Handle answer selection
  const handleAnswerSelect = (cellId: string) => {
    selectAnswer(cellId);
  };

  // Redirect if playerId is missing
  if (!playerId) {
    return <Redirect to={`/game/join/${gameId}`} />;
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
            The game you're looking for doesn't exist or has ended.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => navigate('/')}>Return to Home</Button>
        </div>
      </div>
    );
  }

  // Render the game view
  return (
    <GamePlayView
      gameId={gameId}
      currentPlayerId={playerId}
      gameData={gameData}
      onAnswerSelect={handleAnswerSelect}
    />
  );
}
