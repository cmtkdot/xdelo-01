import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateMediaUrl } from "@/components/media/utils/urlValidation";
import { Channel } from "@/components/media/types";

export const useSyncChannels = () => {
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

  const handleSync = async () => {
    if (selectedChannels.size === 0) {
      toast.error("No channels selected", {
        description: "Please select at least one channel to sync"
      });
      return;
    }

    const loadingToast = toast.loading("Starting media sync...", {
      description: `Preparing to sync ${selectedChannels.size} channel${selectedChannels.size > 1 ? 's' : ''}`
    });
    
    console.log('Starting sync for channels:', Array.from(selectedChannels));

    try {
      setSyncing(true);
      console.log('Invoking sync-media-captions function...');
      
      const { data, error } = await supabase.functions.invoke('sync-media-captions', {
        body: { 
          chatIds: Array.from(selectedChannels)
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Sync response:', data, error);

      if (error) throw error;

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
          description: `Updated ${data?.updatedCount} media items from ${selectedChannels.size} channel${selectedChannels.size > 1 ? 's' : ''}`
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

  return {
    channels,
    isChannelsError,
    channelsError,
    selectedChannels,
    isSyncing,
    toggleChannel,
    toggleAll,
    handleSync
  };
};