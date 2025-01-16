import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MediaItem } from "../types";

interface SyncCaptionButtonProps {
  item: MediaItem;
}

export const SyncCaptionButton = ({ item }: SyncCaptionButtonProps) => {
  const [isSyncingCaption, setSyncingCaption] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const getMessageId = () => {
    if (!item?.metadata) return null;
    const metadata = item.metadata as { message_id?: number };
    return metadata.message_id || null;
  };

  const handleSyncCaption = async () => {
    const messageId = getMessageId();
    if (!item.chat_id || !messageId) return;
    
    setSyncingCaption(true);
    try {
      const { error } = await supabase.functions.invoke('sync-media-captions', {
        body: { 
          chatId: item.chat_id,
          messageId: messageId
        }
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['media-table'] });
      
      toast({
        title: "Success",
        description: "Caption synced successfully",
      });
    } catch (error) {
      console.error('Error syncing caption:', error);
      toast({
        title: "Error",
        description: "Failed to sync caption",
        variant: "destructive",
      });
    } finally {
      setSyncingCaption(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSyncCaption}
      disabled={isSyncingCaption || !item.chat_id || !getMessageId()}
      className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingCaption ? 'animate-spin' : ''}`} />
      Sync Caption
    </Button>
  );
};