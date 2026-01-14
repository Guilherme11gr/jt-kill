/**
 * Real-time Event Processor
 *
 * Manages incoming broadcast events with smart cache updates:
 * - Selective fetch: Only refetch changed entity, not entire list
 * - Debounced event queue (150ms)
 * - Deduplication by eventId
 * - Sequence gap detection
 * - Batch invalidations when needed
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getInvalidationKeys, deduplicateInvalidationKeys } from './invalidation-map';
import type { BroadcastEvent } from './types';
import { fetchTaskById, type TasksResponse } from '@/lib/query/hooks/use-tasks';
import { fetchFeatureById } from '@/lib/query/hooks/use-features';

// Constants for memory management
const PROCESSED_EVENTS_TTL = 60 * 1000; // 1 minute
const MAX_PROCESSED_EVENTS = 500; // Smaller limit
const MAX_MUTATION_RETRIES = 10; // 2 seconds (10 * 200ms)

// ✅ Feature flag for smart updates (vs full invalidation)
const USE_SMART_UPDATES = true;

interface EventProcessorOptions {
  /** Debounce delay in ms (default: 300ms) */
  debounceDelay?: number;

  /** Optional callback for debugging */
  onEventsProcessed?: (events: BroadcastEvent[], keys: Set<string>) => void;
}

// Track processed events with timestamp for proper LRU cleanup
interface ProcessedEvent {
  eventId: string;
  timestamp: number;
}

export function useRealtimeEventProcessor(options?: EventProcessorOptions) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Event queue for batching
  const eventQueueRef = useRef<BroadcastEvent[]>([]);

  // Track processed event IDs for deduplication with timestamp
  const processedEventsRef = useRef<Map<string, ProcessedEvent>>(new Map());

  // Timer for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Track last seen sequence number for gap detection
  const lastSequenceRef = useRef<Map<string, number>>(new Map());
  
  // ✅ Track retry counts to prevent infinite loops
  const retryCountRef = useRef<Map<string, number>>(new Map());

  const debounceDelay = options?.debounceDelay || 150; // ✅ 150ms = melhor UX

  /**
   * Detect gaps in sequence numbers
   * Returns list of entities with gaps
   */
  const detectSequenceGaps = useCallback((events: BroadcastEvent[]): string[] => {
    const gaps: string[] = [];

    for (const event of events) {
      const entityKey = `${event.entityType}:${event.entityId}`;
      const lastSequence = lastSequenceRef.current.get(entityKey);

      if (lastSequence && event.sequence > lastSequence + 1) {
        // Gap detected!
        gaps.push(`${entityKey} (missing ${lastSequence + 1} to ${event.sequence - 1})`);
      }
    }

    return gaps;
  }, []);

  /**
   * Process batch of events in queue
   */
  const processBatch = useCallback(async () => { // ✅ Tornar async
    if (eventQueueRef.current.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      const startTime = performance.now(); // 🔍 Performance tracking
      const events = [...eventQueueRef.current];
      
      // Clear queue
      eventQueueRef.current = [];

      console.log(`[Realtime] ⏱️ Processing batch of ${events.length} events (started at ${startTime.toFixed(2)}ms)`);

      // Deduplicate events by eventId - O(n) using Set instead of O(n²) filter+findIndex
      const seenEventIds = new Set<string>();
      const uniqueEvents: BroadcastEvent[] = [];

      for (const event of events) {
        if (!seenEventIds.has(event.eventId)) {
          seenEventIds.add(event.eventId);
          uniqueEvents.push(event);
        }
      }

      const dedupeTime = performance.now();
      console.log(`[Realtime] ⏱️ Deduplication took ${(dedupeTime - startTime).toFixed(2)}ms`);

      // Detect sequence gaps
      const gaps = detectSequenceGaps(uniqueEvents);
      if (gaps.length > 0) {
        console.warn(`[Realtime] Detected ${gaps.length} sequence gaps`, gaps);
        // TODO: Could trigger catch-up query here
      }

      // Get all invalidation keys and deduplicate
      const keySet = deduplicateInvalidationKeys(uniqueEvents);

      const keysTime = performance.now();
      console.log(`[Realtime] ⏱️ Key generation took ${(keysTime - dedupeTime).toFixed(2)}ms`);

      const parsedKeys = Array.from(keySet).map(k => JSON.parse(k));
      console.log('[Realtime] Invalidating keys (expanded):', parsedKeys);
      
      const invalidateStart = performance.now();
      
      if (USE_SMART_UPDATES) {
        // ✅ SMART UPDATE: Tenta fetch seletivo, mas com timeout
        // Se demorar >500ms, fallback para invalidação normal
        
        const SMART_UPDATE_TIMEOUT = 500; // 500ms max para fetch
        let updatedCount = 0;
        
        for (const event of uniqueEvents) {
          const entityType = event.entityType;
          const entityId = event.entityId;
          
          // Para cada tipo de evento, decide estratégia
          switch (event.eventType) {
            case 'updated':
            case 'status_changed': {
              // ✅ SMART: Busca task/feature com timeout
              if (entityType === 'task' || entityType === 'feature') {
                try {
                  console.log(`[Realtime] 🎯 Smart update: fetching ${entityType} ${entityId} (timeout=${SMART_UPDATE_TIMEOUT}ms)`);
                  
                  // Fetch com timeout (race condition)
                  const fetchPromise = entityType === 'task' 
                    ? fetchTaskById(entityId) 
                    : fetchFeatureById(entityId);
                    
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), SMART_UPDATE_TIMEOUT)
                  );
                  
                  const updated = await Promise.race([fetchPromise, timeoutPromise]) as any;
                  
                  if (entityType === 'task') {
                    // Atualiza task em cache
                    const listQueries = queryClient.getQueriesData<TasksResponse>({ 
                      queryKey: [event.orgId, 'tasks', 'list']
                    });
                    
                    for (const [queryKey, data] of listQueries) {
                      if (data?.items) {
                        const index = data.items.findIndex(t => t.id === entityId);
                        if (index !== -1) {
                          const newItems = [...data.items];
                          newItems[index] = updated;
                          queryClient.setQueryData(queryKey, { ...data, items: newItems });
                          console.log(`[Realtime] ✅ Updated task in cache`);
                          updatedCount++;
                        }
                      }
                    }
                  } else if (entityType === 'feature') {
                    // Atualiza feature em cache
                    const listQueries = queryClient.getQueriesData({ 
                      queryKey: [event.orgId, 'features', 'list']
                    });
                    
                    for (const [queryKey, data] of listQueries) {
                      if (Array.isArray(data)) {
                        const index = data.findIndex((f: any) => f.id === entityId);
                        if (index !== -1) {
                          const newData = [...data];
                          newData[index] = updated;
                          queryClient.setQueryData(queryKey, newData);
                          console.log(`[Realtime] ✅ Updated feature in cache`);
                          updatedCount++;
                        }
                      }
                    }
                  }
                  
                  // Atualiza parents (não bloqueia)
                  if (event.featureId) {
                    queryClient.invalidateQueries({
                      queryKey: [event.orgId, 'features', 'detail', event.featureId],
                      refetchType: 'active',
                    });
                  }
                  if (event.epicId) {
                    queryClient.invalidateQueries({
                      queryKey: [event.orgId, 'epics', 'detail', event.epicId],
                      refetchType: 'active',
                    });
                  }
                  
                } catch (error) {
                  // Timeout ou erro: fallback para invalidação
                  console.warn(`[Realtime] ⚠️ Smart update failed (${error}), using invalidation fallback`);
                  for (const keyString of keySet) {
                    const key = JSON.parse(keyString);
                    queryClient.invalidateQueries({ 
                      queryKey: key,
                      refetchType: 'active',
                    });
                  }
                }
              } else {
                // Outros entity types: invalida normalmente
                for (const keyString of keySet) {
                  const key = JSON.parse(keyString);
                  queryClient.invalidateQueries({ 
                    queryKey: key,
                    refetchType: 'active',
                  });
                }
              }
              break;
            }
            
            case 'created':
            case 'deleted': {
              // Esses precisam invalidar listas (item novo/removido muda total)
              for (const keyString of keySet) {
                const key = JSON.parse(keyString);
                queryClient.invalidateQueries({ 
                  queryKey: key,
                  refetchType: 'active',
                });
                updatedCount++;
              }
              break;
            }
            
            case 'commented': {
              // Invalida apenas query de comments da task
              queryClient.invalidateQueries({
                queryKey: [event.orgId, 'tasks', 'detail', entityId],
                refetchType: 'active',
              });
              updatedCount++;
              break;
            }
          }
        }
        
        console.log(`[Realtime] ⏱️ Smart updates: ${updatedCount} cache updates performed`);
        
      } else {
        // ❌ FALLBACK: Invalidação tradicional (refetch tudo)
        for (const keyString of keySet) {
          const key = JSON.parse(keyString);
          queryClient.invalidateQueries({ 
            queryKey: key,
            refetchType: 'active',
          });
        }
      }
      
      const invalidateEnd = performance.now();
      console.log(`[Realtime] ⏱️ Invalidation took ${(invalidateEnd - invalidateStart).toFixed(2)}ms`);
      console.log(`[Realtime] ⏱️ TOTAL processing time: ${(invalidateEnd - startTime).toFixed(2)}ms`);

      // Mark events as processed with timestamp
      const now = Date.now();
      for (const event of uniqueEvents) {
        processedEventsRef.current.set(event.eventId, {
          eventId: event.eventId,
          timestamp: now,
        });

        // Track last sequence per entity
        const entityKey = `${event.entityType}:${event.entityId}`;
        lastSequenceRef.current.set(entityKey, event.sequence);
      }

      // Cleanup old processed events using TTL + LRU
      if (processedEventsRef.current.size > MAX_PROCESSED_EVENTS) {
        const entries = Array.from(processedEventsRef.current.entries());
        
        // First: Remove events older than TTL
        for (const [eventId, { timestamp }] of entries) {
          if (now - timestamp > PROCESSED_EVENTS_TTL) {
            processedEventsRef.current.delete(eventId);
          }
        }
        
        // Second: If still above limit, remove oldest entries
        if (processedEventsRef.current.size > MAX_PROCESSED_EVENTS) {
          const sorted = Array.from(processedEventsRef.current.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
          
          const excessCount = sorted.length - MAX_PROCESSED_EVENTS;
          const toRemove = sorted.slice(0, excessCount);
          
          for (const [eventId] of toRemove) {
            processedEventsRef.current.delete(eventId);
          }
          
          console.log(`[Realtime] Cleaned up ${toRemove.length} old events`);
        }
      }

      console.log(`[Realtime] Invalidated ${keySet.size} query keys`);

      // Debug callback
      options?.onEventsProcessed?.(uniqueEvents, keySet);

    } catch (error) {
      console.error('[Realtime] Failed to process event batch:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient, options, detectSequenceGaps]);

  /**
   * Process a single broadcast event
   * Adds to queue and schedules debounced invalidation
   */
  const processEvent = useCallback((event: BroadcastEvent) => {
    // Dedup: ignore if we've already processed this event
    if (processedEventsRef.current.has(event.eventId)) {
      console.log(`[Realtime] Ignoring duplicate event: ${event.eventId}`);
      return;
    }

    // ✅ Check for pending mutations to avoid race condition
    const hasPendingMutation = queryClient.isMutating({
      predicate: (mutation) => {
        const mutationKey = mutation.options.mutationKey as string[] | undefined;
        return mutationKey?.includes(event.entityId) ?? false;
      },
    }) > 0;
    
    if (hasPendingMutation) {
      const retries = retryCountRef.current.get(event.eventId) || 0;
      
      if (retries >= MAX_MUTATION_RETRIES) {
        console.warn(`[Realtime] Giving up on event ${event.eventId} after ${retries} retries`);
        retryCountRef.current.delete(event.eventId);
        // Process anyway - mutation might be stuck
        eventQueueRef.current.push(event);
        
        // Schedule batch processing
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => processBatch(), debounceDelay);
        return;
      }
      
      console.log(`[Realtime] Delaying event ${event.eventId} - mutation pending (retry ${retries + 1}/${MAX_MUTATION_RETRIES})`);
      retryCountRef.current.set(event.eventId, retries + 1);
      
      // ✅ Cancel existing debounce timer before retry
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = undefined;
      }
      
      setTimeout(() => processEvent(event), 200);
      return;
    }
    
    // ✅ Success: clear retry count
    retryCountRef.current.delete(event.eventId);

    // Add to queue
    eventQueueRef.current.push(event);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Schedule batch processing
    debounceTimerRef.current = setTimeout(() => {
      processBatch();
    }, debounceDelay);
  }, [debounceDelay, processBatch]);

  /**
   * Get statistics for debugging
   */
  const getStats = useCallback(() => {
    return {
      queueSize: eventQueueRef.current.length,
      processedCount: processedEventsRef.current.size,
      isProcessing,
    };
  }, [isProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    processEvent,
    isProcessing,
    getStats,
  };
}
