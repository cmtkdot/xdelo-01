import { Link2 } from "lucide-react";

interface MediaTableUrlsProps {
  googleDriveUrl?: string;
  publicUrl?: string;
  fileUrl: string;
  onOpenFile: (url: string) => void;
}

export const MediaTableUrls = ({ 
  googleDriveUrl, 
  publicUrl, 
  fileUrl, 
  onOpenFile 
}: MediaTableUrlsProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getFormattedDriveUrl = (url: string) => {
    if (!url) return '';
    return url.includes('/view') ? url : `https://drive.google.com/file/d/${url}/view`;
  };

  const getFormattedSupabaseUrl = (url: string) => {
    if (!url) return '';
    // Ensure URL starts with http/https
    return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <div className="space-y-2">
      {googleDriveUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(getFormattedDriveUrl(googleDriveUrl), '_blank');
          }}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors group w-full"
        >
          <Link2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate max-w-[300px] group-hover:underline">
            Google Drive
          </span>
        </button>
      )}
      {publicUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(getFormattedSupabaseUrl(publicUrl), '_blank');
          }}
          className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors group w-full"
        >
          <Link2 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate max-w-[300px] group-hover:underline">
            Supabase URL
          </span>
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenFile(fileUrl);
        }}
        className="flex items-center gap-2 text-white/70 hover:text-white/90 transition-colors group w-full"
      >
        <Link2 className="w-4 h-4 flex-shrink-0" />
        <span className="truncate max-w-[300px] group-hover:underline">
          Original URL
        </span>
      </button>
    </div>
  );
};