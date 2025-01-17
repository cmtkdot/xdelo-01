import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MediaTableContent } from "@/components/media/table/MediaTableContent";
import { useMediaTableSort } from "@/components/media/table/hooks/useMediaTableSort";
import { useMediaTableSelection } from "@/components/media/table/hooks/useMediaTableSelection";
import MediaTableFilters from "@/components/media/table/MediaTableFilters";
import { MediaTableToolbar } from "@/components/media/table/MediaTableToolbar";

const MediaTable = () => {
  const { toast } = useToast();
  const [uploadStatus, setUploadStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  
  // Fetch channels for the filter
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('id, user_id, chat_id, title, username, is_active, created_at, updated_at');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: mediaItems, isLoading, error, refetch } = useQuery({
    queryKey: ['media-table', uploadStatus, selectedChannel, selectedType],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session) {
        throw new Error('You must be logged in to view media');
      }

      let query = supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

      if (uploadStatus === "not_uploaded") {
        query = query.is('google_drive_id', null);
      } else if (uploadStatus === "uploaded") {
        query = query.not('google_drive_id', 'is', null);
      }

      if (selectedChannel !== "all") {
        query = query.eq('chat_id', parseInt(selectedChannel));
      }

      if (selectedType !== "all") {
        query = query.eq('media_type', selectedType);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching media",
          description: error.message,
        });
        throw error;
      }
      
      return data;
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    console.log('Setting up real-time subscription for media table');
    
    const channel = supabase
      .channel('media_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media'
        },
        (payload) => {
          console.log('Received real-time update:', payload);
          refetch();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const { sortedMediaItems, handleSort, sortConfig } = useMediaTableSort(mediaItems);
  const {
    selectedMedia,
    handleToggleSelect,
    handleSelectAll,
    allSelected,
    someSelected,
  } = useMediaTableSelection(mediaItems);

  const openFileInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)] text-center">
        <div className="p-6 max-w-sm mx-auto bg-red-500/10 rounded-lg border border-red-500/20">
          <p className="text-red-400">Error: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <MediaTableFilters
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            uploadStatus={uploadStatus}
            setUploadStatus={setUploadStatus}
            channels={channels}
          />
          <MediaTableToolbar
            selectedChannels={[selectedChannel]}
            setSelectedChannels={([channel]) => setSelectedChannel(channel)}
            selectedTypes={[selectedType]}
            setSelectedTypes={([type]) => setSelectedType(type)}
            uploadStatus={uploadStatus}
            setUploadStatus={setUploadStatus}
            channels={channels || []}
            onRefetch={() => refetch()}
          />
        </div>

        <MediaTableContent
          isLoading={isLoading}
          mediaItems={sortedMediaItems}
          onSort={handleSort}
          onSelectAll={handleSelectAll}
          allSelected={allSelected}
          someSelected={someSelected}
          selectedMedia={selectedMedia}
          onToggleSelect={handleToggleSelect}
          onOpenFile={openFileInNewTab}
          sortConfig={sortConfig}
          onRefetch={() => refetch()}
        />
      </div>
    </div>
  );
};

export default MediaTable;
