import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MediaItem } from "../types";

interface DeleteMediaButtonProps {
  item: MediaItem;
  onDelete: () => void;
}

export const DeleteMediaButton = ({ item, onDelete }: DeleteMediaButtonProps) => {
  const [isDeletingMedia, setDeletingMedia] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const getMessageId = () => {
    if (!item?.metadata) return null;
    const metadata = item.metadata as { message_id?: number };
    return metadata.message_id || null;
  };

  const handleDeleteMedia = async () => {
    if (!item.id || isDeletingMedia) return;
    
    try {
      setDeletingMedia(true);
      
      if (item.file_name) {
        const { error: storageError } = await supabase.storage
          .from('telegram-media')
          .remove([item.file_name]);

        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('media')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      if (item.metadata) {
        const messageId = getMessageId();
        if (messageId && item.chat_id) {
          const { error: messageError } = await supabase
            .from('messages')
            .delete()
            .eq('chat_id', item.chat_id)
            .eq('message_id', messageId);

          if (messageError) {
            console.error('Error deleting associated message:', messageError);
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['media'] });
      await queryClient.invalidateQueries({ queryKey: ['media-table'] });
      
      toast({
        title: "Success",
        description: "Media and associated data deleted successfully",
      });

      onDelete();

    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: "Failed to delete media. Please ensure you have permission to delete this item.",
        variant: "destructive",
      });
    } finally {
      setDeletingMedia(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDeleteMedia}
      disabled={isDeletingMedia}
      className="text-xs"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      {isDeletingMedia ? 'Deleting...' : 'Delete'}
    </Button>
  );
};