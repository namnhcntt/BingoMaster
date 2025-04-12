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

  // Strategy reference must be declared outside of the effect
  const strategyRef = useRef(1);
  const maxStrategies = 3;

  // Function to create WebSocket with different URL strategies
  const createWebSocketConnection = useCallback((urlStrategy: number, urlToConnect: string | null) => {
    if (!urlToConnect) return null;
    
    // Determine protocol based on the current browser URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl: string;
    
    // Try different URL strategies based on the strategy number
    switch (urlStrategy) {
      case 1:
        // Strategy 1: Use window.location.host (default)
        const baseUrl = window.location.host.split('?')[0];
        wsUrl = `${protocol}//${baseUrl}${urlToConnect}`;
        break;
        
      case 2:
        // Strategy 2: Use only hostname without port
        wsUrl = `${protocol}//${window.location.hostname}${urlToConnect}`;
        break;
        
      case 3: 
        // Strategy 3: Use hostname with explicit port 443 for wss or 80 for ws
        const port = protocol === 'wss:' ? '443' : '80';
        wsUrl = `${protocol}//${window.location.hostname}:${port}${urlToConnect}`;
        break;
        
      default:
        // Default fallback
        wsUrl = `${protocol}//${window.location.host}${urlToConnect}`;
    }
    
    console.log(`Connecting WebSocket (strategy ${urlStrategy}) to:`, wsUrl);
    return new WebSocket(wsUrl);
  }, []);
  
  // Create WebSocket connection
  useEffect(() => {
    if (!url) return;
    
    // Reset strategy when URL changes
    strategyRef.current = 1;
    
    // Start with the first strategy
    const ws = createWebSocketConnection(strategyRef.current, url);
    if (!ws) return;
    
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
      
      // Additional error handling and diagnostics
      try {
        // Log the URL that failed
        console.error('WebSocket connection failed with URL:', ws.url);
        
        if (ws.url.includes('undefined')) {
          console.error('Invalid WebSocket URL detected. Host information is missing or incorrect.');
        }
      } catch (err) {
        console.error('Error accessing WebSocket URL:', err);
      }
      
      // Try the next strategy if we haven't exhausted all options
      if (strategyRef.current < maxStrategies) {
        strategyRef.current++;
        console.log(`WebSocket connection failed. Trying strategy ${strategyRef.current}...`);
        
        try {
          // Close the current connection attempt
          ws.close();
          
          // Create a new WebSocket with the next strategy
          const newWs = createWebSocketConnection(strategyRef.current, url);
          if (!newWs) {
            setReadyState(ReadyState.Closed);
            return;
          }
          
          // Recreate event handlers for the new connection
          newWs.onopen = ws.onopen;
          newWs.onclose = ws.onclose;
          newWs.onmessage = ws.onmessage;
          newWs.onerror = ws.onerror;
          
          // Update the socket state with the new connection
          setSocket(newWs);
          setReadyState(ReadyState.Connecting);
        } catch (e) {
          console.error('Error during WebSocket fallback attempt:', e);
          setReadyState(ReadyState.Closed);
        }
      } else {
        console.error('All WebSocket connection strategies failed.');
        setReadyState(ReadyState.Closed);
      }
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
  }, [url, createWebSocketConnection]);

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
