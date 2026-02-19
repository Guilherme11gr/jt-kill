'use client';

import { useEffect, useState } from 'react';

interface KaiEvent {
  id?: number;
  type: string;
  data?: { file?: string; message?: string; command?: string };
  timestamp?: number;
}

export default async function KaiStreamPage({
  params,
}: {
  params: Promise<{ taskKey: string }>;
}) {
  const { taskKey } = await params;
  const [events, setEvents] = useState<KaiEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const taskKey = params.taskKey;
    setIsRunning(true);

    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/kai/history/${taskKey}`);
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };

    // Fetch inicial
    fetchHistory();

    // Polling a cada segundo
    const interval = setInterval(fetchHistory, 1000);

    return () => {
      clearInterval(interval);
      setIsRunning(false);
    };
  }, [taskKey]);

  const renderEvent = (event: KaiEvent) => {
    const emoji = {
      read: '📖',
      edit: '📝',
      create: '✏️',
      command: '⚡',
      error: '❌',
      success: '✅',
      info: 'ℹ️',
      session_start: '🚀',
      session_end: '🏁',
      raw: '•',
    };

    const icon = emoji[event.type as keyof typeof emoji] || '•';

    switch (event.type) {
      case 'read':
        return (
          <div className="text-blue-400">
            {icon} Read <span className="text-white/60">{event.data?.file}</span>
          </div>
        );
      case 'edit':
        return (
          <div className="text-green-400">
            {icon} Edit <span className="text-white/60">{event.data?.file}</span>
          </div>
        );
      case 'create':
        return (
          <div className="text-purple-400">
            {icon} Create <span className="text-white/60">{event.data?.file}</span>
          </div>
        );
      case 'command':
        return (
          <div className="text-yellow-400">
            {icon} {event.data?.command}
          </div>
        );
      case 'error':
        return (
          <div className="text-red-400">
            {icon} {event.data?.message}
          </div>
        );
      case 'session_start':
        return (
          <div className="text-cyan-400 font-bold">
            {icon} Session Started
          </div>
        );
      case 'session_end':
        return (
          <div className="text-cyan-400 font-bold">
            {icon} Session Ended
          </div>
        );
      default:
        return (
          <div className="text-white/70">
            {icon} {event.data?.message || ''}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-6 font-mono text-sm">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 border-b border-green-900/50 pb-4">
          <h1 className="text-2xl text-green-400 mb-2">
            🤖 Kai Stream Viewer
          </h1>
          <div className="text-white/60">
            Task: <span className="text-white">{taskKey}</span>
            {isRunning && (
              <span className="ml-4 text-yellow-400 animate-pulse">
                ● Live
              </span>
            )}
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-lg border border-green-900/50 p-4 min-h-[600px]">
          {events.length === 0 ? (
            <div className="text-white/40 text-center py-12">
              Aguardando sessão do Kai...
              <br />
              <span className="text-xs">
                Execute ./kai-delegate-simple.sh {params.taskKey}
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              {events.map((event, index) => (
                <div
                  key={index}
                  className="py-1 hover:bg-green-900/20 px-2 rounded"
                >
                  {renderEvent(event)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-white/40 text-xs">
          Total events: {events.length}
        </div>
      </div>
    </div>
  );
}
