import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MediaItem, Channel } from "@/components/media/types";
import { useToast } from "@/hooks/use-toast";
import { GoogleSheetsConfig } from "@/components/media/GoogleSheetsConfig";
import useMediaSubscription from "@/components/media/hooks/useMediaSubscription";
import { MediaTableContent } from "@/components/media/table/MediaTableContent";
import { useMediaTableSort } from "@/components/media/table/hooks/useMediaTableSort";
import { useMediaTableSelection } from "@/components/media/table/hooks/useMediaTableSelection";
import MediaTableFilters from "@/components/media/table/MediaTableFilters";
import { MediaTableToolbar } from "@/components/media/table/MediaTableToolbar";

const GOOGLE_CLIENT_ID = "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com";

const MediaTable = () => {
  const { toast } = useToast();
  const [spreadsheetId, setSpreadsheetId] = useState<string>();
  const [uploadStatus, setUploadStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  
  useMediaSubscription(() => refetch());
  
  // Fetch channels for the filter
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('id, chat_id, title');
      
      if (error) throw error;
      return data as Channel[];
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
      
      return data as MediaItem[];
    },
  });

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
          <p className="text-red-400">Error: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="space-y-6">
        <div className="mb-6">
          <GoogleSheetsConfig onSpreadsheetIdSet={setSpreadsheetId} />
        </div>
        
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="mb-4">
              <MediaTableFilters
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                uploadStatus={uploadStatus}
                setUploadStatus={setUploadStatus}
                channels={channels}
              />
            </div>

            <MediaTableToolbar
              selectedMedia={selectedMedia}
              onDeleteSuccess={() => refetch()}
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
    </GoogleOAuthProvider>
  );
};

export default MediaTable;
