import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import MediaGallery from "@/components/MediaGallery";
import { Channel } from "@/components/media/types";

const ChannelSync = () => {
  const [isSyncing, setSyncing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  const { data: channels, isError: isChannelsError, error: channelsError } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      console.log('Fetching channels for sync...');
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('title');
      
      if (error) {
        console.error('Error fetching channels:', error);
        toast.error("Failed to load channels", {
          description: `Error: ${error.message}`
        });
        throw error;
      }
      console.log('Channels fetched successfully:', data);
      return data as Channel[];
    },
  });

  const handleSync = async () => {
    if (selectedChannel === "all") {
      toast.error("Please select a channel to sync");
      return;
    }

    const loadingToast = toast.loading("Starting media sync...", {
      description: "Preparing to sync channel and organize files"
    });
    
    try {
      setSyncing(true);
      console.log('Invoking sync-telegram-channel function...');
      
      const { data, error } = await supabase.functions.invoke('sync-telegram-channel', {
        body: { channelId: selectedChannel }
      });

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success("Sync completed successfully", {
        description: "Channel media has been synchronized"
      });
      
    } catch (error) {
      console.error('Error syncing channel:', error);
      toast.dismiss(loadingToast);
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    } finally {
      setSyncing(false);
    }
  };

  if (isChannelsError) {
    return (
      <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-white">Channel Sync</CardTitle>
          <CardDescription className="text-red-500">
            Failed to load channels: {channelsError instanceof Error ? channelsError.message : "Unknown error"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-white">Channel Sync</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Select a channel to sync and view its media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="all"
                  value="all"
                  checked={selectedChannel === "all"}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="text-primary"
                />
                <Label htmlFor="all">All Channels</Label>
              </div>
              {channels?.map((channel) => (
                <div key={channel.id} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={channel.id}
                    value={channel.chat_id.toString()}
                    checked={selectedChannel === channel.chat_id.toString()}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className="text-primary"
                  />
                  <Label htmlFor={channel.id}>{channel.title}</Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || selectedChannel === "all"}
            className="w-full sm:w-auto justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? "Syncing Channel..." : "Sync Channel"}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-8">
        <MediaGallery />
      </div>
    </div>
  );
};

export default ChannelSync;