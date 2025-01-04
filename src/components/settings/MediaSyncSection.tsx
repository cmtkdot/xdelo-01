import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Channel {
  id: string;
  title: string;
  chat_id: number;
}

const MediaSyncSection = () => {
  const [isSyncing, setSyncing] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<number>>(new Set());

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data as Channel[];
    },
  });

  const handleSync = async () => {
    if (selectedChannels.size === 0) {
      toast.error("Please select at least one channel to sync");
      return;
    }

    try {
      setSyncing(true);
      const { error } = await supabase.functions.invoke('sync-media-captions', {
        body: { 
          chatIds: Array.from(selectedChannels),
          updatePublicUrls: true
        }
      });

      if (error) throw error;

      toast.success("Media sync completed successfully");
    } catch (error) {
      console.error('Error syncing media:', error);
      toast.error("Failed to sync media");
    } finally {
      setSyncing(false);
    }
  };

  const toggleChannel = (chatId: number) => {
    setSelectedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (!channels) return;
    
    if (selectedChannels.size === channels.length) {
      setSelectedChannels(new Set());
    } else {
      setSelectedChannels(new Set(channels.map(c => c.chat_id)));
    }
  };

  return (
    <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-gray-800 dark:text-white">Media Sync</CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Manually sync media from selected Telegram channels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="select-all"
              checked={channels?.length === selectedChannels.size}
              onCheckedChange={toggleAll}
            />
            <Label 
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select All Channels
            </Label>
          </div>
          
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-4">
              {channels?.map((channel) => (
                <div key={channel.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={channel.id}
                    checked={selectedChannels.has(channel.chat_id)}
                    onCheckedChange={() => toggleChannel(channel.chat_id)}
                  />
                  <Label
                    htmlFor={channel.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {channel.title}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || selectedChannels.size === 0}
            className="w-full sm:w-auto justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? "Syncing Media..." : "Sync Media"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MediaSyncSection;