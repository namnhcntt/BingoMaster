import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Users, GamepadIcon } from 'lucide-react';

export default function Join() {
  const { gameId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isJoining, setIsJoining] = useState(false);

  // Get game info
  const { data: gameInfo, isLoading, error } = useQuery({
    queryKey: [`/api/games/${gameId}`],
    enabled: !!gameId,
  });

  // Set display name from user if available
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  // Join game mutation
  const joinGameMutation = useMutation({
    mutationFn: async (data: { displayName: string }) => {
      setIsJoining(true);
      const response = await apiRequest('POST', `/api/games/${gameId}/join`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Joined game successfully',
        description: `You've been assigned to ${data.groupName}`,
      });
      navigate(`/game/play/${gameId}?playerId=${data.playerId}`);
    },
    onError: (error) => {
      setIsJoining(false);
      toast({
        title: 'Failed to join game',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle join button click
  const handleJoin = () => {
    if (!displayName.trim()) {
      toast({
        title: 'Display name required',
        description: 'Please enter a name to join the game',
        variant: 'destructive',
      });
      return;
    }

    joinGameMutation.mutate({ displayName: displayName.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Game Not Found</CardTitle>
            <CardDescription className="text-center">
              The game you're looking for doesn't exist or has ended
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-red-500">Error: {error.message}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/')}>Return Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!gameInfo) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Game Not Found</CardTitle>
            <CardDescription className="text-center">
              The game you're looking for doesn't exist or has ended
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/')}>Return Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Join Game</CardTitle>
          <CardDescription className="text-center">
            You're joining "{gameInfo.name}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex flex-col items-center">
              <GamepadIcon className="h-10 w-10 text-primary-500 mb-2" />
              <div className="text-sm text-center">
                <span className="font-medium">{gameInfo.boardSize}×{gameInfo.boardSize}</span>
                <div className="text-muted-foreground">Board Size</div>
              </div>
            </div>
            
            <div className="h-12 border-l border-gray-200 dark:border-gray-700"></div>
            
            <div className="flex flex-col items-center">
              <Users className="h-10 w-10 text-primary-500 mb-2" />
              <div className="text-sm text-center">
                <span className="font-medium">{gameInfo.groupCount}</span>
                <div className="text-muted-foreground">Groups</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Your Display Name</Label>
            <Input
              id="display-name"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isJoining}
            />
            <p className="text-sm text-muted-foreground">
              This is how others will see you in the game
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full" 
            onClick={handleJoin}
            disabled={isJoining || !displayName.trim()}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Game"
            )}
          </Button>
          
          <div className="text-sm text-center text-muted-foreground">
            You'll be randomly assigned to one of the groups
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
