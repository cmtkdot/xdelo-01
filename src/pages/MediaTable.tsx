import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MediaItem } from "@/components/media/types";
import { useToast } from "@/hooks/use-toast";
import { GoogleSheetsConfig } from "@/components/media/GoogleSheetsConfig";
import useMediaSubscription from "@/components/media/hooks/useMediaSubscription";
import { MediaTableContent } from "@/components/media/table/MediaTableContent";
import { useMediaTableSort } from "@/components/media/table/hooks/useMediaTableSort";
import { useMediaTableSelection } from "@/components/media/table/hooks/useMediaTableSelection";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GoogleDriveUploader from "@/components/media/GoogleDriveUploader";

const GOOGLE_CLIENT_ID = "977351558653-ohvqd6j78cbei8aufarbdsoskqql05s1.apps.googleusercontent.com";

const MediaTable = () => {
  const { toast } = useToast();
  const [spreadsheetId, setSpreadsheetId] = useState<string>();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  
  useMediaSubscription(spreadsheetId);
  
  // Fetch channels for the filter
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('chat_id, title');
      
      if (error) throw error;
      return data;
    },
  });
  
  const { data: mediaItems, isLoading, error } = useQuery({
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
            <div className="flex flex-col xs:flex-row gap-3 mb-4">
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="w-full xs:w-[180px] bg-[#1A1F2C] border-white/10 text-white/90 font-medium hover:bg-[#222632] focus:ring-purple-500/50">
                  <SelectValue placeholder="Select Channel" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-white/10">
                  <SelectItem value="all" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    All Channels
                  </SelectItem>
                  {channels?.map((channel) => (
                    <SelectItem 
                      key={channel.chat_id} 
                      value={channel.chat_id.toString()}
                      className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]"
                    >
                      {channel.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full xs:w-[180px] bg-[#1A1F2C] border-white/10 text-white/90 font-medium hover:bg-[#222632] focus:ring-purple-500/50">
                  <SelectValue placeholder="Select Media Type" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-white/10">
                  <SelectItem value="all" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    All Types
                  </SelectItem>
                  <SelectItem value="photo" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    Photos
                  </SelectItem>
                  <SelectItem value="video" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    Videos
                  </SelectItem>
                  <SelectItem value="animation" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    Animations
                  </SelectItem>
                  <SelectItem value="edited_channel_post" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    Edited Posts
                  </SelectItem>
                  <SelectItem value="channel_post" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    Channel Posts
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={uploadStatus} onValueChange={setUploadStatus}>
                <SelectTrigger className="w-full xs:w-[180px] bg-[#1A1F2C] border-white/10 text-white/90 font-medium hover:bg-[#222632] focus:ring-purple-500/50">
                  <SelectValue placeholder="Upload Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-white/10">
                  <SelectItem value="all" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    All Files
                  </SelectItem>
                  <SelectItem value="not_uploaded" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    Not Uploaded
                  </SelectItem>
                  <SelectItem value="uploaded" className="text-white/90 hover:bg-[#222632] focus:bg-[#222632]">
                    Uploaded
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between items-center">
              {selectedMedia.length > 0 && (
                <span className="text-white/70">
                  {selectedMedia.length} item{selectedMedia.length !== 1 ? 's' : ''} selected
                </span>
              )}
              {selectedMedia.length > 0 && (
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Selected to Drive
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Files to Google Drive</DialogTitle>
                    </DialogHeader>
                    <GoogleDriveUploader
                      selectedFiles={selectedMedia}
                      onSuccess={() => setIsUploadDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
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
          />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default MediaTable;