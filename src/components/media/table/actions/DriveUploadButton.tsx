import { Upload, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import GoogleDriveUploader from "../../GoogleDriveUploader";

interface DriveUploadButtonProps {
  fileUrl: string;
  fileName: string;
  hasGoogleDrive: boolean;
  onUpdate?: () => void;
}

export const DriveUploadButton = ({ fileUrl, fileName, hasGoogleDrive, onUpdate }: DriveUploadButtonProps) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  if (hasGoogleDrive) {
    return (
      <button
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 cursor-default"
        disabled
      >
        Uploaded <Check className="w-4 h-4" />
      </button>
    );
  }

  return (
    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300 transition-all duration-200 font-medium">
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
          onSuccess={onUpdate}
          onClose={() => setIsUploadDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};