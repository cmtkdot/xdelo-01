import { ExternalLink, Upload, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import GoogleDriveUploader from "../GoogleDriveUploader";

interface MediaTableActionsProps {
  fileUrl: string;
  fileName: string;
  onView: () => void;
  hasGoogleDrive: boolean;
}

export const MediaTableActions = ({ fileUrl, fileName, onView, hasGoogleDrive }: MediaTableActionsProps) => {
  return (
    <div className="text-right space-x-2 whitespace-nowrap">
      {!hasGoogleDrive ? (
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
              fileUrl={fileUrl}
              fileName={fileName}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 cursor-default"
          disabled
        >
          Uploaded <Check className="w-4 h-4" />
        </button>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onView}
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
    </div>
  );
};