import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

export function useGame(gameId?: string, playerId?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { sendMessage, connectionStatus } = useWebSocket(
    gameId ? `/ws/game/${gameId}${playerId ? `/player/${playerId}` : '/host'}` : null
  );

  // Start game
  const startGameMutation = useMutation({
    mutationFn: async () => {
      if (!gameId) throw new Error("Game ID is required");
      const response = await apiRequest("POST", `/api/games/${gameId}/start`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game started",
        description: "The game has been started successfully",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/host`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to start game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // End game
  const endGameMutation = useMutation({
    mutationFn: async () => {
      if (!gameId) throw new Error("Game ID is required");
      const response = await apiRequest("POST", `/api/games/${gameId}/end`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game ended",
        description: "The game has been ended successfully",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/host`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to end game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Next question
  const nextQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!gameId) throw new Error("Game ID is required");
      const response = await apiRequest("POST", `/api/games/${gameId}/next-question`, {});
      return response.json();
    },
    onSuccess: () => {
      // No need for toast here, the new question will be shown via websocket update
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/host`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to proceed to next question",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Select answer
  const selectAnswerMutation = useMutation({
    mutationFn: async (cellId: string) => {
      if (!gameId || !playerId) throw new Error("Game ID and Player ID are required");
      const response = await apiRequest("POST", `/api/games/${gameId}/answer`, {
        playerId,
        cellId,
      });
      return response.json();
    },
    // No need for success/error handlers, responses will come via websocket
  });

  // WebSocket helper methods
  const startGame = () => {
    if (connectionStatus === "Open") {
      sendMessage(JSON.stringify({
        type: "start_game",
        gameId,
      }));
    } else {
      startGameMutation.mutate();
    }
  };

  const endGame = () => {
    if (connectionStatus === "Open") {
      sendMessage(JSON.stringify({
        type: "end_game",
        gameId,
      }));
    } else {
      endGameMutation.mutate();
    }
  };

  const nextQuestion = () => {
    if (connectionStatus === "Open") {
      sendMessage(JSON.stringify({
        type: "next_question",
        gameId,
      }));
    } else {
      nextQuestionMutation.mutate();
    }
  };

  const selectAnswer = (cellId: string) => {
    if (connectionStatus === "Open") {
      sendMessage(JSON.stringify({
        type: "select_answer",
        gameId,
        playerId,
        cellId,
      }));
    } else {
      selectAnswerMutation.mutate(cellId);
    }
  };

  return {
    startGame,
    endGame,
    nextQuestion,
    selectAnswer,
    isStartingGame: startGameMutation.isPending,
    isEndingGame: endGameMutation.isPending,
    isChangingQuestion: nextQuestionMutation.isPending,
    isSelectingAnswer: selectAnswerMutation.isPending,
  };
}
