import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MediaTableUrlsProps {
  googleDriveUrl?: string | null;
  publicUrl?: string | null;
  fileUrl?: string | null;
  onOpenFile?: () => void;
}

export const MediaTableUrls = ({
  googleDriveUrl,
  publicUrl,
  fileUrl,
  onOpenFile
}: MediaTableUrlsProps) => {
  const handleUrlOpen = (url: string | null | undefined, type: 'drive' | 'public') => {
    if (!url) {
      toast.error(`No ${type} URL available`);
      return;
    }

    try {
      const formattedUrl = type === 'drive' 
        ? (url.includes('/view') ? url : `https://drive.google.com/file/d/${url}/view`)
        : (url.startsWith('http') ? url : `https://${url}`);
      
      window.open(formattedUrl, '_blank');
    } catch (error) {
      console.error(`Error opening ${type} URL:`, error);
      toast.error(`Failed to open ${type} URL`);
    }
  };

  return (
    <div className="space-y-2">
      {googleDriveUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleUrlOpen(googleDriveUrl, 'drive');
          }}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors group w-full"
        >
          <Link2 className="w-4 h-4" />
          <span className="truncate">Google Drive</span>
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      )}
      
      {publicUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleUrlOpen(publicUrl, 'public');
          }}
          className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors group w-full"
        >
          <Link2 className="w-4 h-4" />
          <span className="truncate">Public URL</span>
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      )}

      {fileUrl && onOpenFile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFile();
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors group w-full"
        >
          <Link2 className="w-4 h-4" />
          <span className="truncate">File URL</span>
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      )}
    </div>
  );
};