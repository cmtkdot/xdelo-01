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
  return (
    <div className="space-y-1">
      {googleDriveUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Ensure we're using the correct view URL format
            const driveViewUrl = googleDriveUrl.includes('/view') 
              ? googleDriveUrl 
              : `https://drive.google.com/file/d/${googleDriveUrl}/view`;
            window.open(driveViewUrl, '_blank');
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
            // Ensure the URL is properly formatted for direct viewing
            const formattedUrl = publicUrl.startsWith('http') ? publicUrl : `https://${publicUrl}`;
            window.open(formattedUrl, '_blank');
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