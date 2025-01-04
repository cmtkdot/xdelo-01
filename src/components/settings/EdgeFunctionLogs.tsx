import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LogEntry {
  id: string;
  timestamp: string;
  function_name: string;
  status: 'success' | 'error';
  message: string;
}

export const EdgeFunctionLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Subscribe to real-time log updates
    const channel = supabase
      .channel('edge-function-logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'edge_function_logs',
        },
        (payload) => {
          setLogs((currentLogs) => [payload.new as LogEntry, ...currentLogs].slice(0, 100));
        }
      )
      .subscribe();

    // Initial fetch of recent logs
    const fetchInitialLogs = async () => {
      const { data, error } = await supabase
        .from('edge_function_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data);
      }
    };

    fetchInitialLogs();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="w-full bg-black text-green-400 border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="text-green-400">Edge Function Logs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] w-full">
          <div className="p-4 font-mono text-sm">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`mb-2 ${
                  log.status === 'error' ? 'text-red-400' : 'text-green-400'
                }`}
              >
                <span className="text-gray-500">
                  [{new Date(log.timestamp).toLocaleString()}]
                </span>{' '}
                <span className="text-blue-400">{log.function_name}:</span>{' '}
                {log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-gray-500">No logs available...</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};