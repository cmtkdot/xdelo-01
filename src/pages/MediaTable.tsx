import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MediaItem, Channel } from "@/components/media/types";
import { useToast } from "@/hooks/use-toast";
import { MediaTableContent } from "@/components/media/table/MediaTableContent";
import { useMediaTableSort } from "@/components/media/table/hooks/useMediaTableSort";
import { useMediaTableSelection } from "@/components/media/table/hooks/useMediaTableSelection";
import MediaTableFilters from "@/components/media/table/MediaTableFilters";
import { MediaTableToolbar } from "@/components/media/table/MediaTableToolbar";
import { useNavigate } from "react-router-dom";

const GOOGLE_CLIENT_ID = "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com";

const MediaTable = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadStatus, setUploadStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [authChecked, setAuthChecked] = useState(false);
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }
      
      setAuthChecked(true);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Sorting and selection hooks
  const { sortedMediaItems, handleSort, sortConfig } = useMediaTableSort([]);
  const { 
    selectedMedia,
    handleSelectAll,
    handleToggleSelect,
    allSelected,
    someSelected 
  } = useMediaTableSelection(sortedMediaItems);

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
      let query = supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

      if (uploadStatus !== 'all') {
        query = query.eq('upload_status', uploadStatus);
      }

      if (selectedChannel !== 'all') {
        const chatId = parseInt(selectedChannel, 10);
        if (!isNaN(chatId)) {
          query = query.eq('chat_id', chatId);
        }
      }

      if (selectedType !== 'all') {
        query = query.eq('type', selectedType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as MediaItem[];
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching media",
        description: error.message
      });
    }
  }, [error, toast]);

  if (!authChecked || isLoading) {
    return <div>Loading...</div>;
  }

  const openFileInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="h-full flex flex-col space-y-4">
        <div className="w-full">
          <MediaTableFilters
            uploadStatus={uploadStatus}
            setUploadStatus={setUploadStatus}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            channels={channels || []}
          />
          <MediaTableToolbar onDeleteSuccess={() => refetch()} />
        </div>
        <div className="flex-1">
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