'use client';

import { useRealtimeStatus } from '@/hooks/use-realtime-status';
import { Badge } from './badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

/**
 * Connection status badge for real-time status
 * 
 * Shows visual indicator of WebSocket connection state:
 * - Green dot: Connected (real-time active)
 * - Yellow dot: Connecting (establishing connection)
 * - Red dot: Disconnected/Failed (fallback to manual refresh)
 * 
 * @example
 * <ConnectionBadge />
 * // or with custom size
 * <ConnectionBadge size="sm" />
 */
export function ConnectionBadge({ size = 'default' }: { size?: 'sm' | 'default' }) {
  const { isConnected, isConnecting, isDisconnected, hasFailed } = useRealtimeStatus();
  
  const sizeClasses = size === 'sm' 
    ? 'h-5 w-5' 
    : 'h-6 w-6';
  
  const textSizeClasses = size === 'sm'
    ? 'text-xs'
    : 'text-sm';

  if (isConnecting) {
    return (
      <Badge variant="secondary" className="gap-2">
        <Loader2 className={`animate-spin ${sizeClasses}`} />
        <span className={textSizeClasses}>Conectando...</span>
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge variant="default" className="gap-2 bg-green-500 hover:bg-green-600">
        <Wifi className={sizeClasses} />
        <span className={textSizeClasses}>Ao vivo</span>
      </Badge>
    );
  }

  if (hasFailed) {
    return (
      <Badge variant="destructive" className="gap-2">
        <WifiOff className={sizeClasses} />
        <span className={textSizeClasses}>Erro</span>
      </Badge>
    );
  }

  // Default: disconnected
  return (
    <Badge variant="secondary" className="gap-2">
      <WifiOff className={sizeClasses} />
      <span className={textSizeClasses}>Offline</span>
    </Badge>
  );
}
