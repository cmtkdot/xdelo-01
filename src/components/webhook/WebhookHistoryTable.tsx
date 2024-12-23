import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Link, Calendar, Database } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebhookHistory {
  id: string;
  webhook_url: {
    name: string;
    url: string;
  };
  sent_at: string;
  fields_sent: string[];
  schedule_type: 'manual' | 'hourly' | 'daily' | 'weekly';
  status: string;
  media_count: number;
}

const WebhookHistoryTable = () => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['webhook-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_history')
        .select(`
          *,
          webhook_url:webhook_urls(name, url)
        `)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as WebhookHistory[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-gray-700/20 animate-pulse rounded" />
        <div className="h-20 bg-gray-700/20 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-[#0088cc]" />
        <h2 className="text-lg font-semibold text-white">Webhook History</h2>
      </div>
      
      <div className="border border-white/10 rounded-lg bg-black/20 backdrop-blur-sm">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white">Name</TableHead>
                <TableHead className="text-white">URL</TableHead>
                <TableHead className="text-white">Sent</TableHead>
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white">Fields</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white text-right">Media Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.map((record) => (
                <TableRow key={record.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">
                    {record.webhook_url.name}
                  </TableCell>
                  <TableCell className="text-white/80">
                    <div className="flex items-center gap-1">
                      <Link className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{record.webhook_url.url}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/80">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDistanceToNow(new Date(record.sent_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell className="text-white/80">
                    <span className="capitalize">{record.schedule_type}</span>
                  </TableCell>
                  <TableCell className="text-white/80">
                    <div className="flex items-center gap-1">
                      <Database className="w-4 h-4" />
                      {record.fields_sent.length} fields
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${
                      record.status === 'success' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {record.status}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-white/80">
                    {record.media_count} items
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default WebhookHistoryTable;