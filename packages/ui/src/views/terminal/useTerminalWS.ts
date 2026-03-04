import { useRef, useCallback, useEffect } from 'react';

const WS_URL = `ws://${window.location.hostname}:${window.location.port || '3141'}/ws/terminal`;

interface TerminalWSCallbacks {
  onCreated: (sessionId: string) => void;
  onOutput: (sessionId: string, data: string) => void;
  onExited: (sessionId: string, exitCode: number) => void;
  onError: (error: string) => void;
}

export function useTerminalWS(callbacks: TerminalWSCallbacks) {
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'terminal:created':
            callbacksRef.current.onCreated(msg.sessionId);
            break;
          case 'terminal:output':
            callbacksRef.current.onOutput(msg.sessionId, msg.data);
            break;
          case 'terminal:exited':
            callbacksRef.current.onExited(msg.sessionId, msg.exitCode);
            break;
          case 'terminal:error':
            callbacksRef.current.onError(msg.error);
            break;
        }
      } catch {
        /* ignore parse errors */
      }
    };

    return () => ws.close();
  }, []);

  const createSession = useCallback((cwd?: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'terminal:create', cwd }));
  }, []);

  const sendInput = useCallback((sessionId: string, data: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'terminal:input', sessionId, data }));
  }, []);

  const resize = useCallback((sessionId: string, cols: number, rows: number) => {
    wsRef.current?.send(JSON.stringify({ type: 'terminal:resize', sessionId, cols, rows }));
  }, []);

  const destroySession = useCallback((sessionId: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'terminal:destroy', sessionId }));
  }, []);

  return { createSession, sendInput, resize, destroySession };
}
