import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MediaItem } from "@/components/media/types";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, ExternalLink, Image as ImageIcon, Link2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import GoogleDriveUploader from "@/components/media/GoogleDriveUploader";

const MediaTable = () => {
  const { toast } = useToast();
  
  const { data: mediaItems, isLoading, error } = useQuery({
    queryKey: ['media-table'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session) {
        throw new Error('You must be logged in to view media');
      }

      const { data, error } = await supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-red-400">Error: {(error as Error).message}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="animate-pulse text-sky-400">Loading media data...</div>
      </div>
    );
  }

  const openFileInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 backdrop-blur-xl bg-black/40 border border-white/10 p-4 rounded-lg">
        <FileSpreadsheet className="w-6 h-6 text-sky-400" />
        <h1 className="text-xl font-semibold text-white">Media Table View</h1>
      </div>
      
      <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-lg">
        <ScrollArea className="h-[calc(100vh-16rem)] rounded-lg">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-black/60 sticky top-0">
                <TableRow>
                  <TableHead className="text-sky-400 min-w-[200px]">File Name</TableHead>
                  <TableHead className="text-sky-400 min-w-[150px]">Type</TableHead>
                  <TableHead className="text-sky-400 min-w-[150px]">Channel</TableHead>
                  <TableHead className="text-sky-400 min-w-[200px]">Created At</TableHead>
                  <TableHead className="text-sky-400 min-w-[300px]">Caption</TableHead>
                  <TableHead className="text-sky-400 min-w-[400px]">File URL</TableHead>
                  <TableHead className="text-sky-400 text-right min-w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mediaItems?.map((item) => (
                  <TableRow key={item.id} className="hover:bg-white/5">
                    <TableCell className="font-medium text-white/90">
                      <div className="flex items-center gap-2">
                        {item.media_type.includes('image') ? (
                          <ImageIcon className="w-4 h-4 text-sky-400" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                        )}
                        {item.file_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/70">{item.media_type}</TableCell>
                    <TableCell className="text-white/70">{item.chat?.title || 'N/A'}</TableCell>
                    <TableCell className="text-white/70">
                      {item.created_at ? format(new Date(item.created_at), 'PPpp') : 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-white/70">
                      {item.caption || 'No caption'}
                    </TableCell>
                    <TableCell className="text-white/70">
                      <button
                        onClick={() => openFileInNewTab(item.file_url)}
                        className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors group"
                      >
                        <Link2 className="w-4 h-4" />
                        <span className="truncate max-w-[300px] group-hover:underline">
                          {item.file_url}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => openFileInNewTab(item.file_url)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 hover:text-sky-300 transition-all duration-200 font-medium"
                            >
                              View <ExternalLink className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Open file in new tab</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300 transition-all duration-200 font-medium"
                          >
                            Drive <Upload className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload to Google Drive</DialogTitle>
                          </DialogHeader>
                          <GoogleDriveUploader
                            fileUrl={item.file_url}
                            fileName={item.file_name}
                          />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MediaTable;