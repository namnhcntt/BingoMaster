import { useState, useEffect, useRef, useCallback } from 'react';

export enum ReadyState {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

type ConnectionStatus = 'Connecting' | 'Open' | 'Closing' | 'Closed';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  lastMessage: MessageEvent | null;
  connectionStatus: ConnectionStatus;
  sendMessage: (message: string) => void;
}

export function useWebSocket(url: string | null): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [readyState, setReadyState] = useState<ReadyState>(ReadyState.Closed);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create WebSocket connection
  useEffect(() => {
    if (!url) return;

    // Determine protocol based on the current browser URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${url}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setReadyState(ReadyState.Open);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    
    ws.onclose = () => {
      setReadyState(ReadyState.Closed);
      
      // Set a timeout to reconnect
      timeoutRef.current = setTimeout(() => {
        setSocket(null);
      }, 3000);
    };
    
    ws.onmessage = (event) => {
      setLastMessage(event);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setSocket(ws);
    setReadyState(ReadyState.Connecting);
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (ws.readyState === ReadyState.Open) {
        ws.close();
      }
    };
  }, [url]);

  // Handle reconnection on URL change
  useEffect(() => {
    return () => {
      if (socket && socket.readyState === ReadyState.Open) {
        socket.close();
      }
    };
  }, [socket, url]);

  // Send message function
  const sendMessage = useCallback(
    (message: string) => {
      if (socket && socket.readyState === ReadyState.Open) {
        socket.send(message);
        return true;
      }
      return false;
    },
    [socket]
  );

  // Convert readyState to string status
  const connectionStatus: ConnectionStatus = (() => {
    switch (readyState) {
      case ReadyState.Connecting:
        return 'Connecting';
      case ReadyState.Open:
        return 'Open';
      case ReadyState.Closing:
        return 'Closing';
      case ReadyState.Closed:
        return 'Closed';
      default:
        return 'Closed';
    }
  })();

  return {
    socket,
    lastMessage,
    connectionStatus,
    sendMessage,
  };
}
