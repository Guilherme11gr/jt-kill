'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { RealtimeConnectionManager } from '@/lib/realtime/connection-manager';
import type { ConnectionStatus, BroadcastEvent, ConnectionManagerConfig } from '@/lib/realtime/types';
import { useCurrentOrgId } from '@/lib/query/hooks/use-org-id';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeEventProcessor } from '@/lib/realtime/event-processor';
import { createClient } from '@/lib/supabase/client';

// ✅ Constants moved outside component to avoid recreation on each render
const MAX_QUEUED_BROADCASTS = 100;

/**
 * Context for sharing a single RealtimeConnectionManager instance
 * across the entire app.
 * 
 * ✅ SSR-safe (scoped per request)
 * ✅ Testable (mockable via Provider)
 * ✅ React lifecycle managed
 * ✅ Multi-org natural (re-creates when orgId changes)
 */
interface RealtimeContextValue {
  manager: RealtimeConnectionManager | null;
  status: ConnectionStatus;
  broadcast: (event: Omit<BroadcastEvent, 'sequence' | 'tabId'>) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Hook to access the shared RealtimeConnectionManager
 * 
 * @throws Error if used outside RealtimeProvider
 * 
 * @example
 * function MyComponent() {
 *   const { status, broadcast } = useRealtimeManager();
 *   return <div>{status}</div>;
 * }
 */
export function useRealtimeManager() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeManager must be used within RealtimeProvider');
  }
  return context;
}

/**
 * Realtime Provider
 * 
 * Creates and manages a SINGLE RealtimeConnectionManager instance
 * for the entire app.
 * 
 * ✅ Only one WebSocket connection
 * ✅ Only one Supabase client for realtime
 * ✅ Automatic cleanup on unmount
 * ✅ Reconnects when orgId changes
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const managerRef = useRef<RealtimeConnectionManager | null>(null);
  const queuedBroadcastsRef = useRef<Array<Omit<BroadcastEvent, 'sequence' | 'tabId'>>>([]);
  const orgId = useCurrentOrgId();
  const { user } = useAuth();
  
  // ✅ Use app's shared Supabase singleton (same auth state across entire app)
  const supabase = useMemo(() => createClient(), []);

  // Initialize event processor
  const onEventsProcessed = useCallback((events: BroadcastEvent[], keys: Set<string>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[RealtimeProvider] Processed ${events.length} events, ${keys.size} keys`);
    }
  }, []);

  const { processEvent } = useRealtimeEventProcessor({
    onEventsProcessed,
  });
  
  // ✅ Use ref to avoid dependency loop
  const processEventRef = useRef(processEvent);
  useEffect(() => {
    processEventRef.current = processEvent;
  }, [processEvent]);

  // Create manager once on mount
  useEffect(() => {
    if (!managerRef.current) {
      const onEvent = (event: BroadcastEvent) => {
        const receiveTime = Date.now();
        const eventTime = new Date(event.timestamp).getTime();
        const eventAge = receiveTime - eventTime;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RealtimeProvider] ⏱️ Event received (age: ${eventAge.toFixed(0)}ms)`);
        }
        
        // ✅ Filter own events to prevent infinite loop
        // If we receive our own broadcast (self: true), skip processing
        // We already did optimistic update locally
        if (managerRef.current && event.tabId === managerRef.current.getTabId()) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[RealtimeProvider] Ignoring own event:', event.eventId);
          }
          return;
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[RealtimeProvider] Received event from other client:', event);
        }
        processEventRef.current(event); // ✅ Use ref instead of direct call
      };

      const config: ConnectionManagerConfig = {
        onStatusChange: (newStatus: ConnectionStatus) => {
          setStatus(newStatus);
        },
        onEvent,
      };

      managerRef.current = new RealtimeConnectionManager(config, supabase);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[RealtimeProvider] Manager created with shared Supabase client');
      }
    }

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
        if (process.env.NODE_ENV !== 'production') {
          console.log('[RealtimeProvider] Manager destroyed');
        }
      }
    };
  }, []); // ✅ Empty deps - no recreation

  // Connect/disconnect when orgId or userId changes
  useEffect(() => {
    if (!orgId || !user?.id || !managerRef.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[RealtimeProvider] Waiting for orgId and user...');
      }
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[RealtimeProvider] Connecting to org ${orgId}`);
    }
    managerRef.current.connect(orgId, user.id);
    
    // ✅ NOTE: Don't flush here! connect() is async, status is still 'connecting'
    // Queued broadcasts will be flushed when broadcast() is called after connection

    return () => {
      if (managerRef.current) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RealtimeProvider] Disconnecting from org ${orgId}`);
        }
        managerRef.current.disconnect();
      }
    };
  }, [orgId, user?.id]);

  // Broadcast helper - queues if not connected, flushes queue when connected
  const broadcast = useCallback((event: Omit<BroadcastEvent, 'sequence' | 'tabId'>) => {
    if (!managerRef.current || status !== 'connected') {
      // ✅ FIX: Limit queue size to prevent unbounded memory growth
      if (queuedBroadcastsRef.current.length >= MAX_QUEUED_BROADCASTS) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[RealtimeProvider] Queue full, dropping oldest broadcast');
        }
        queuedBroadcastsRef.current.shift(); // Remove oldest
      }
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[RealtimeProvider] Manager not ready, queueing broadcast');
      }
      queuedBroadcastsRef.current.push(event);
      return;
    }
    
    // ✅ Flush any queued broadcasts first
    if (queuedBroadcastsRef.current.length > 0) {
      const queued = queuedBroadcastsRef.current.splice(0);
      for (const queuedEvent of queued) {
        managerRef.current.broadcast(queuedEvent);
      }
    }
    
    // ✅ Broadcast current event
    managerRef.current.broadcast(event);
  }, [status]); // ✅ Re-create when status changes to flush queue on connect

  const contextValue: RealtimeContextValue = {
    manager: managerRef.current,
    status,
    broadcast,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}
