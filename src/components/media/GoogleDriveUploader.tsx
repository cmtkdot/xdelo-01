import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "./types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface GoogleDriveUploaderProps {
  fileUrl?: string;
  fileName?: string;
  selectedFiles?: MediaItem[];
  onSuccess?: () => void;
}

const GoogleDriveUploader = ({ fileUrl, fileName, selectedFiles, onSuccess }: GoogleDriveUploaderProps) => {
  const { toast } = useToast();

  const uploadToGoogleDrive = async () => {
    try {
      if (selectedFiles && selectedFiles.length > 0) {
        console.log('Uploading multiple files:', selectedFiles);
        
        // Format files data properly
        const filesData = selectedFiles.map(file => ({
          fileUrl: file.file_url,
          fileName: file.file_name
        }));

        const { data, error } = await supabase.functions.invoke('upload-to-drive', {
          body: JSON.stringify({ files: filesData })
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }

        toast({
          title: "Success!",
          description: `Successfully uploaded ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} to Google Drive`,
        });

        onSuccess?.();
        return data;
      } else if (fileUrl && fileName) {
        console.log('Uploading single file:', { fileUrl, fileName });
        
        const { data, error } = await supabase.functions.invoke('upload-to-drive', {
          body: JSON.stringify({ fileUrl, fileName })
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }

        toast({
          title: "Success!",
          description: "File successfully uploaded to Google Drive",
        });

        return data;
      }
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload file(s) to Google Drive. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          Files will be automatically uploaded to your Google Drive storage using service account authentication.
        </AlertDescription>
      </Alert>
      
      <Button
        onClick={uploadToGoogleDrive}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
      >
        <Upload className="w-4 h-4" />
        Upload to Google Drive
      </Button>
    </div>
  );
};

export default GoogleDriveUploader;