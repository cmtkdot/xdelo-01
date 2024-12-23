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
import { FileSpreadsheet, ExternalLink, Image as ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MediaTable = () => {
  const { data: mediaItems, isLoading } = useQuery({
    queryKey: ['media-table'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MediaItem[];
    },
  });

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
          <Table>
            <TableHeader className="bg-black/60 sticky top-0">
              <TableRow>
                <TableHead className="text-sky-400">File Name</TableHead>
                <TableHead className="text-sky-400">Type</TableHead>
                <TableHead className="text-sky-400">Channel</TableHead>
                <TableHead className="text-sky-400">Created At</TableHead>
                <TableHead className="text-sky-400">Caption</TableHead>
                <TableHead className="text-sky-400">File URL</TableHead>
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => openFileInNewTab(item.file_url)}
                            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
                          >
                            View File <ExternalLink className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Open file in new tab</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MediaTable;