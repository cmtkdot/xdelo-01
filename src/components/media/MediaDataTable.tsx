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
import { MediaItem } from "./types";
import { format } from "date-fns";
import { Link2 } from "lucide-react";

export function MediaDataTable() {
  const { data: mediaItems, isLoading } = useQuery({
    queryKey: ['media'],
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
    return <div className="text-center p-4">Loading media data...</div>;
  }

  const openFileInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Caption</TableHead>
            <TableHead>File URL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mediaItems?.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.file_name}</TableCell>
              <TableCell>{item.media_type}</TableCell>
              <TableCell>{item.chat?.title || 'N/A'}</TableCell>
              <TableCell>
                {item.created_at 
                  ? format(new Date(item.created_at), 'PPpp')
                  : 'N/A'}
              </TableCell>
              <TableCell className="max-w-md truncate">
                {item.caption || 'No caption'}
              </TableCell>
              <TableCell>
                <button
                  onClick={() => openFileInNewTab(item.file_url)}
                  className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="truncate max-w-xs">
                    {item.file_url}
                  </span>
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}