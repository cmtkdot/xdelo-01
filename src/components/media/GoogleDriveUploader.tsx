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
  onClose?: () => void;
}

const GoogleDriveUploader = ({ 
  fileUrl, 
  fileName, 
  selectedFiles, 
  onSuccess,
  onClose 
}: GoogleDriveUploaderProps) => {
  const { toast } = useToast();

  const uploadToGoogleDrive = async () => {
    try {
      if (selectedFiles && selectedFiles.length > 0) {
        console.log('Starting batch upload to Google Drive folder: 1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet');
        console.log('Files to upload:', selectedFiles);
        
        const payload = {
          files: selectedFiles.map(file => ({
            fileUrl: file.file_url,
            fileName: file.file_name
          }))
        };
        
        console.log('Request payload:', payload);

        const { data, error } = await supabase.functions.invoke('upload-to-drive', {
          body: payload
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }

        console.log('Upload response:', data);

        if (data?.results) {
          const results = Array.isArray(data.results) ? data.results : [data.results];
          
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const mediaItem = selectedFiles[i];
            
            if (result.fileId && result.webViewLink) {
              console.log(`Updating media record ${mediaItem.id} with Google Drive info:`, {
                fileId: result.fileId,
                webViewLink: result.webViewLink
              });

              const { error: updateError } = await supabase
                .from('media')
                .update({
                  google_drive_id: result.fileId,
                  google_drive_url: result.webViewLink
                })
                .eq('id', mediaItem.id);

              if (updateError) {
                console.error('Error updating media record:', updateError);
              } else {
                console.log(`Successfully updated media record ${mediaItem.id}`);
              }
            }
          }
        }

        toast({
          title: "Success!",
          description: `Successfully uploaded ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} to Google Drive`,
        });

        onSuccess?.();
        onClose?.();
        
        return data;
      } else if (fileUrl && fileName) {
        console.log('Starting single file upload to Google Drive folder: 1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet');
        console.log('File details:', { fileUrl, fileName });
        
        const payload = { fileUrl, fileName };
        console.log('Request payload:', payload);

        const { data, error } = await supabase.functions.invoke('upload-to-drive', {
          body: payload
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }

        console.log('Upload response:', data);

        toast({
          title: "Success!",
          description: "File successfully uploaded to Google Drive",
        });

        onSuccess?.();
        onClose?.();

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