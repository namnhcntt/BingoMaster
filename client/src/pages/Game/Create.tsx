import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import GameCreationWizard from '@/components/game/GameCreationWizard';
import { Redirect } from 'wouter';

export default function Create() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [redirectToGame, setRedirectToGame] = useState<string | null>(null);
  
  // Create game mutation - moved up before any conditional returns
  const createGameMutation = useMutation({
    mutationFn: async (data: { settings: any, questions: any[] }) => {
      const response = await apiRequest('POST', '/api/games', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Game created successfully',
        description: `Your game "${data.name}" is ready to start!`,
      });
      setRedirectToGame(data.id);
    },
    onError: (error) => {
      toast({
        title: 'Failed to create game',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Redirect to game host page if game was created
  if (redirectToGame) {
    return <Redirect to={`/game/host/${redirectToGame}`} />;
  }

  // Handle wizard completion
  const handleWizardComplete = (settings: any, questions: any[]) => {
    createGameMutation.mutate({ settings, questions });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Game</h1>
        <p className="text-muted-foreground">
          Configure your Bingo game settings and add questions
        </p>
      </div>

      <GameCreationWizard onComplete={handleWizardComplete} />
    </div>
  );
}
