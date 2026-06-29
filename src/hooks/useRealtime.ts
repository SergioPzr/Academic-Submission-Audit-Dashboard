import { useEffect, useRef, type RealtimePostgresChangesPayload } from 'react';
import { supabase } from '../lib/supabase';

type TableName = 'Entregas' | 'Ventanas_Tiempo' | 'Logs_Auditoria';
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T> {
  table: TableName;
  filter?: string;
  event?: EventType;
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

export function useRealtime<T extends Record<string, unknown>>({
  table,
  filter,
  event = '*',
  onPayload,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const callbackRef = useRef(onPayload);
  callbackRef.current = onPayload;

  useEffect(() => {
    if (!enabled) return;

    const channelName = `${table}-${filter ?? 'all'}-${Date.now()}`;
    const channelConfig: Record<string, unknown> = {
      schema: 'public',
      table,
      event,
    };
    if (filter) channelConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig as Parameters<typeof channel.on>[1], (payload) => {
        callbackRef.current(payload as RealtimePostgresChangesPayload<T>);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`Realtime channel error for ${table}, retrying...`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, event, enabled]);
}
