import { useEffect, useState } from "react";
import useMediaData from "./media/hooks/useMediaData";
import useMediaSubscription from "./media/hooks/useMediaSubscription";
import { MediaFilter } from "./media/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Channel } from "./media/types";
import MediaGalleryHeader from "./media/MediaGalleryHeader";
import MediaFilters from "./media/MediaFilters";
import MediaGalleryContent from "./media/MediaGalleryContent";
import MediaGallerySkeleton from "./media/MediaGallerySkeleton";
import DeleteMediaDialog from "./media/DeleteMediaDialog";
import { SyncManager } from "./media/sync/SyncManager";
import SyncChannelButton from "./media/sync/SyncChannelButton";
import { useMediaGallery } from "./media/hooks/useMediaGallery";

const MediaGallery = () => {
  const {
    filter,
    setFilter,
    channels,
    selectedMedia,
    handleToggleSelect,
    handleDeleteDuplicates,
    handleSyncCaptions,
    isSyncingCaptions,
    isDeletingDuplicates,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    mediaItems,
    isLoading,
    error,
    refetch
  } = useMediaGallery();

  if (error) {
    console.error("Error loading media:", error);
    return (
      <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10 backdrop-blur-xl">
        <p className="text-red-400">
          Error loading media: {error.message}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <MediaGallerySkeleton />;
  }

  return (
    <div className="w-full max-w-[2000px] mx-auto space-y-4">
      <MediaGalleryHeader
        onSyncCaptions={handleSyncCaptions}
        onDeleteDuplicates={handleDeleteDuplicates}
        isSyncingCaptions={isSyncingCaptions}
        isDeletingDuplicates={isDeletingDuplicates}
      />
      
      <div className="w-full backdrop-blur-xl bg-black/40 border border-white/10 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <MediaFilters
            selectedChannel={filter.selectedChannel}
            setSelectedChannel={(value) => setFilter(prev => ({ ...prev, selectedChannel: value }))}
            selectedType={filter.selectedType}
            setSelectedType={(value) => setFilter(prev => ({ ...prev, selectedType: value }))}
            uploadStatus={filter.uploadStatus}
            setUploadStatus={(value) => setFilter(prev => ({ ...prev, uploadStatus: value }))}
            channels={channels}
          />
          
          {filter.selectedChannel !== 'all' && (
            <SyncChannelButton 
              channelId={filter.selectedChannel} 
              onComplete={() => refetch()}
            />
          )}
        </div>
      </div>

      {filter.selectedChannel !== 'all' && (
        <SyncManager channelId={filter.selectedChannel} />
      )}

      <MediaGalleryContent
        mediaItems={mediaItems || []}
        selectedMedia={selectedMedia}
        onToggleSelect={handleToggleSelect}
      />

      <DeleteMediaDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteDuplicates}
      />
    </div>
  );
};

export default MediaGallery;