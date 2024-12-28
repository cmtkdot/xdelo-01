import { useEffect, useState } from "react";
import useMediaData from "./media/hooks/useMediaData";
import useMediaSubscription from "./media/hooks/useMediaSubscription";
import { MediaFilter } from "./media/types";
import { useToast } from "@/components/ui/use-toast";
import WebhookInterface from "./webhook/WebhookInterface";
import { supabase } from "@/integrations/supabase/client";
import { Channel } from "./media/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MediaGalleryHeader from "./media/MediaGalleryHeader";
import MediaFilters from "./media/MediaFilters";
import MediaGalleryContent from "./media/MediaGalleryContent";
import MediaGallerySkeleton from "./media/MediaGallerySkeleton";

const MediaGallery = () => {
  const [filter, setFilter] = useState<MediaFilter>({
    selectedChannel: "all",
    selectedType: "all",
    uploadStatus: "all"
  });
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSyncingCaptions, setSyncingCaptions] = useState(false);
  const [isDeletingDuplicates, setDeletingDuplicates] = useState(false);
  const { toast } = useToast();

  const { data: mediaItems, isLoading, refetch } = useMediaData(filter);
  useMediaSubscription(() => refetch());

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('title, chat_id');
    
    if (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
      return;
    }
    
    setChannels(data || []);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedMedia(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getSelectedMediaData = () => {
    if (!mediaItems) return [];
    return mediaItems.filter(item => selectedMedia.has(item.id));
  };

  const handleDeleteDuplicates = async () => {
    try {
      setDeletingDuplicates(true);
      const { error } = await supabase.functions.invoke('delete-duplicates', {
        body: { keepNewest: true }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Duplicate media files have been cleaned up",
      });

      refetch();
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to delete duplicate media files",
        variant: "destructive",
      });
    } finally {
      setDeletingDuplicates(false);
    }
  };

  const handleSyncCaptions = async () => {
    try {
      setSyncingCaptions(true);
      const { error } = await supabase.functions.invoke('sync-media-captions');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media captions have been synchronized",
      });

      refetch();
    } catch (error) {
      console.error('Error syncing captions:', error);
      toast({
        title: "Error",
        description: "Failed to sync media captions",
        variant: "destructive",
      });
    } finally {
      setSyncingCaptions(false);
    }
  };

  if (isLoading) {
    return <MediaGallerySkeleton />;
  }

  return (
    <div className="w-full max-w-[2000px] mx-auto space-y-4 px-4 md:px-6">
      <MediaGalleryHeader
        onSyncCaptions={handleSyncCaptions}
        onDeleteDuplicates={handleDeleteDuplicates}
        isSyncingCaptions={isSyncingCaptions}
        isDeletingDuplicates={isDeletingDuplicates}
      />
      
      <div className="w-full">
        <WebhookInterface selectedMedia={getSelectedMediaData()} />
      </div>
      
      <div className="w-full backdrop-blur-xl bg-black/40 border border-white/10 p-4 rounded-lg">
        <MediaFilters
          selectedChannel={filter.selectedChannel}
          setSelectedChannel={(value) => setFilter(prev => ({ ...prev, selectedChannel: value }))}
          selectedType={filter.selectedType}
          setSelectedType={(value) => setFilter(prev => ({ ...prev, selectedType: value }))}
          uploadStatus={filter.uploadStatus}
          setUploadStatus={(value) => setFilter(prev => ({ ...prev, uploadStatus: value }))}
          channels={channels}
        />
      </div>

      <MediaGalleryContent
        mediaItems={mediaItems}
        selectedMedia={selectedMedia}
        onToggleSelect={handleToggleSelect}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Duplicate Media</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all duplicate media files, keeping only the newest version of each file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDuplicates}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MediaGallery;
