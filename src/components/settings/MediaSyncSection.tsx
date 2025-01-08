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
import { validateMediaUrl } from "../media/utils/urlValidation";

interface Channel {
  id: string;
  title: string;
  chat_id: number;
}

const MediaSyncSection = () => {
  const [isSyncing, setSyncing] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<number>>(new Set());

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
    if (selectedChannels.size === 0) {
      toast.error("No channels selected", {
        description: "Please select at least one channel to sync"
      });
      return;
    }

    const loadingToast = toast.loading("Starting media sync...", {
      description: `Preparing to sync ${selectedChannels.size} channel${selectedChannels.size > 1 ? 's' : ''} and organize files into content-specific buckets (telegram-pictures/telegram-video)`
    });
    
    console.log('Starting sync for channels:', Array.from(selectedChannels));

    try {
      setSyncing(true);
      console.log('Invoking sync-media-captions function...');
      
      const { data, error } = await supabase.functions.invoke('sync-media-captions', {
        body: { 
          chatIds: Array.from(selectedChannels)
        }
      });

      console.log('Sync response:', data, error);

      if (error) {
        console.error('Sync error:', error);
        toast.dismiss(loadingToast);
        toast.error("Sync failed", {
          description: `Error: ${error.message}`
        });
        throw error;
      }

      // Validate URLs after sync
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (mediaError) {
        console.error('Error fetching media after sync:', mediaError);
      } else if (mediaData && mediaData.length > 0) {
        const media = mediaData[0];
        const validatedUrl = validateMediaUrl(media.file_url, media.media_type) ||
                           validateMediaUrl(media.public_url, media.media_type);
        
        if (!validatedUrl) {
          console.warn('URL validation failed after sync');
          toast.warning("Sync completed with warnings", {
            description: "Some media URLs may need manual verification"
          });
        }
      }

      toast.dismiss(loadingToast);

      if (data?.updatedCount === 0) {
        toast.info("No updates needed", {
          description: "All selected channels are already up to date"
        });
      } else {
        toast.success("Sync completed successfully", {
          description: `Updated ${data?.updatedCount} media items from ${selectedChannels.size} channel${selectedChannels.size > 1 ? 's' : ''} and organized into appropriate buckets`
        });
      }
      
      console.log('Sync completed successfully:', data);
    } catch (error) {
      console.error('Error syncing media:', error);
      toast.dismiss(loadingToast);
      toast.error("Sync failed", {
        description: error instanceof Error 
          ? `Error: ${error.message}` 
          : "An unexpected error occurred during sync"
      });
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

  if (isChannelsError) {
    return (
      <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-gray-800 dark:text-white">Media Sync</CardTitle>
          <CardDescription className="text-red-500">
            Failed to load channels: {channelsError instanceof Error ? channelsError.message : "Unknown error"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-gray-800 dark:text-white">Media Sync</CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Sync and organize media from selected Telegram channels into content-specific buckets
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