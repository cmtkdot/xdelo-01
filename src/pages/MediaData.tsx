import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Link as LinkIcon, Loader2, Webhook } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WebhookData {
  id: string;
  name: string;
  url: string;
  last_sync: string;
  status: string;
}

interface GoogleSheetData {
  id: string;
  name: string;
  url: string;
  last_sync: string;
  mapped_fields: string[];
}

const MediaData = () => {
  // Fetch webhook data
  const { data: webhookData, isLoading: isLoadingWebhooks } = useQuery({
    queryKey: ['webhook-data'],
    queryFn: async () => {
      const { data: webhookUrls, error } = await supabase
        .from('webhook_urls')
        .select(`
          *,
          webhook_history(
            sent_at,
            status,
            fields_sent
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return webhookUrls;
    },
  });

  // Fetch Google Sheets data from localStorage (since we store the mapping there)
  const googleSheetId = localStorage.getItem('googleSheetId');
  const headerMapping = localStorage.getItem('headerMapping');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Webhooks Card */}
        <Card className="bg-black/20 border border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-[#0088cc]" />
              <CardTitle className="text-white">Connected Webhooks</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Active webhook connections and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white">Name</TableHead>
                    <TableHead className="text-white">Last Sync</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingWebhooks ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : webhookData?.map((webhook) => {
                    const lastSync = webhook.webhook_history?.[0]?.sent_at;
                    const status = webhook.webhook_history?.[0]?.status;
                    
                    return (
                      <TableRow key={webhook.id} className="border-white/10">
                        <TableCell className="font-medium text-white">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-400" />
                            {webhook.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {lastSync ? formatDistanceToNow(new Date(lastSync), { addSuffix: true }) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${
                            status === 'success' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {status || 'Not synced'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Google Sheets Card */}
        <Card className="bg-black/20 border border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#0088cc]" />
              <CardTitle className="text-white">Connected Spreadsheet</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Active Google Sheets connection and mapped fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full">
              {googleSheetId ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-2">Connected Sheet</h3>
                    <div className="flex items-center gap-2 text-blue-400">
                      <LinkIcon className="w-4 h-4" />
                      <a 
                        href={`https://docs.google.com/spreadsheets/d/${googleSheetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline"
                      >
                        Open in Google Sheets
                      </a>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-2">Mapped Fields</h3>
                    {headerMapping ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(JSON.parse(headerMapping)).map(([sheet, db]) => (
                          <div 
                            key={sheet} 
                            className="flex items-center justify-between p-2 rounded bg-white/5"
                          >
                            <span className="text-gray-400 text-sm">{sheet}</span>
                            <span className="text-blue-400 text-sm">→</span>
                            <span className="text-white text-sm">{db}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No fields mapped yet</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">No spreadsheet connected</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MediaData;