import { useState, useEffect, useRef, useCallback } from 'react';
import useAuraStore from '../store/auraStore';

const WS_BASE = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

function generateClientId() {
  return `aura-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

const CLIENT_ID = generateClientId();

export function useWebSocket() {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(true);

  const { setWsConnected, addAgentMessage, addAlert, addApproval } = useAuraStore();

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev.slice(-199), data]);
        addAgentMessage(data);

        // Route specific message types
        if (data.type === 'alert') {
          addAlert({
            id: data.id || Date.now().toString(),
            severity: data.severity || 'medium',
            message: data.message,
            cloud: data.cloud,
            timestamp: new Date().toISOString(),
          });
        }
        if (data.type === 'human_approval_request') {
          addApproval({
            id: data.id || Date.now().toString(),
            action: data.action,
            confidence: data.confidence,
            reasoning: data.reasoning,
            impact: data.impact,
            priority: data.priority || 'medium',
            status: 'pending',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Handle plain text messages
        const msgObj = { type: 'raw', content: event.data, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev.slice(-199), msgObj]);
      }
    },
    [addAgentMessage, addAlert, addApproval]
  );

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/${CLIENT_ID}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) return;
        setConnected(true);
        setWsConnected(true);
        reconnectAttempts.current = 0;
        console.log('[AURA WS] Connected');
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        if (!isMounted.current) return;
        setConnected(false);
        setWsConnected(false);
        console.log('[AURA WS] Disconnected');

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          const delay = RECONNECT_INTERVAL * Math.min(reconnectAttempts.current, 4);
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        console.warn('[AURA WS] Error:', err);
        ws.close();
      };
    } catch (err) {
      console.warn('[AURA WS] Failed to connect:', err);
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL);
      }
    }
  }, [handleMessage, setWsConnected]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { messages, sendMessage, connected, disconnect, clientId: CLIENT_ID };
}

export default useWebSocket;
