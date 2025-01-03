import { Link2 } from "lucide-react";
import { MediaItem } from "../types";

interface MediaViewerUrlsProps {
  item: MediaItem;
}

export const MediaViewerUrls = ({ item }: MediaViewerUrlsProps) => {
  // Generate the proper public URL using the Supabase project URL
  const getPublicUrl = (fileUrl: string) => {
    if (!fileUrl) return null;
    try {
      // Extract the bucket and file path from the download URL
      const urlParts = fileUrl.split('/');
      const bucketIndex = urlParts.indexOf('storage') + 2; // Skip 'storage' and 'v1'
      if (bucketIndex >= urlParts.length) return null;
      
      const bucket = urlParts[bucketIndex];
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      // Construct the public URL
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
    } catch (error) {
      console.error('Error generating public URL:', error);
      return null;
    }
  };

  const publicUrl = item.public_url || getPublicUrl(item.file_url);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">File URLs</h4>
      <div className="space-y-1">
        {item.file_url && (
          <div className="flex items-center gap-2 text-xs">
            <Link2 className="w-3 h-3 text-blue-500" />
            <a 
              href={item.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline truncate"
            >
              Original File URL
            </a>
          </div>
        )}
        {item.google_drive_url && (
          <div className="flex items-center gap-2 text-xs">
            <Link2 className="w-3 h-3 text-green-500" />
            <a 
              href={item.google_drive_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-green-500 hover:underline truncate"
            >
              Google Drive URL
            </a>
          </div>
        )}
        {publicUrl && (
          <div className="flex items-center gap-2 text-xs">
            <Link2 className="w-3 h-3 text-purple-500" />
            <a 
              href={publicUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-500 hover:underline truncate"
            >
              Public URL
            </a>
          </div>
        )}
      </div>
    </div>
  );
};