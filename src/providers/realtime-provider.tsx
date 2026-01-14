'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeConnectionManager } from '@/lib/realtime/connection-manager';
import type { ConnectionStatus, BroadcastEvent, ConnectionManagerConfig } from '@/lib/realtime/types';
import { useCurrentOrgId } from '@/lib/query/hooks/use-org-id';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeEventProcessor } from '@/lib/realtime/event-processor';

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

  // Initialize event processor
  const onEventsProcessed = useCallback((events: BroadcastEvent[], keys: Set<string>) => {
    console.log(`[RealtimeProvider] Processed ${events.length} events, ${keys.size} keys`);
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
        
        console.log(`[RealtimeProvider] ⏱️ Event received (age: ${eventAge.toFixed(0)}ms)`);
        
        // ✅ Filter own events to prevent infinite loop
        // If we receive our own broadcast (self: true), skip processing
        // We already did optimistic update locally
        if (managerRef.current && event.tabId === managerRef.current.getTabId()) {
          console.log('[RealtimeProvider] Ignoring own event:', event.eventId);
          return;
        }
        
        console.log('[RealtimeProvider] Received event from other client:', event);
        processEventRef.current(event); // ✅ Use ref instead of direct call
      };

      const config: ConnectionManagerConfig = {
        onStatusChange: (newStatus: ConnectionStatus) => {
          setStatus(newStatus);
        },
        onEvent,
      };

      managerRef.current = new RealtimeConnectionManager(config);
      console.log('[RealtimeProvider] Manager created');
    }

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
        console.log('[RealtimeProvider] Manager destroyed');
      }
    };
  }, []); // ✅ Empty deps - no recreation

  // Connect/disconnect when orgId or userId changes
  useEffect(() => {
    if (!orgId || !user?.id || !managerRef.current) {
      console.log('[RealtimeProvider] Waiting for orgId and user...');
      return;
    }

    console.log(`[RealtimeProvider] Connecting to org ${orgId}`);
    managerRef.current.connect(orgId, user.id);
    
    // ✅ Flush queued broadcasts after connection
    if (queuedBroadcastsRef.current.length > 0) {
      console.log(`[RealtimeProvider] Flushing ${queuedBroadcastsRef.current.length} queued broadcasts`);
      const queued = queuedBroadcastsRef.current.splice(0);
      for (const event of queued) {
        managerRef.current.broadcast(event);
      }
    }

    return () => {
      if (managerRef.current) {
        console.log(`[RealtimeProvider] Disconnecting from org ${orgId}`);
        managerRef.current.disconnect();
      }
    };
  }, [orgId, user?.id]);

  // Broadcast helper
  const broadcast = (event: Omit<BroadcastEvent, 'sequence' | 'tabId'>) => {
    if (!managerRef.current) {
      console.warn('[RealtimeProvider] Manager not ready, queueing broadcast');
      queuedBroadcastsRef.current.push(event); // ✅ Queue para depois
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
  };

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
