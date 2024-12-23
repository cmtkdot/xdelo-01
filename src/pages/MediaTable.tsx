import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MediaItem } from "@/components/media/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MediaTableHeader } from "@/components/media/table/MediaTableHeader";
import { MediaTableRow } from "@/components/media/table/MediaTableRow";

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

  const openFileInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

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

  return (
    <div className="space-y-6">
      <MediaTableHeader />
      
      <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-lg">
        <ScrollArea className="h-[calc(100vh-16rem)] rounded-lg">
          <div className="relative min-w-full">
            <Table>
              <TableHeader className="bg-black/60 sticky top-0 z-10">
                <TableRow>
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
                  <MediaTableRow
                    key={item.id}
                    item={item}
                    onOpenFile={openFileInNewTab}
                  />
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