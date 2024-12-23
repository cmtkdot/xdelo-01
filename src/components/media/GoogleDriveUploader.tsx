import { useGoogleLogin } from '@react-oauth/google';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Upload, AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface GoogleDriveUploaderProps {
  fileUrl: string;
  fileName: string;
}

const GoogleDriveUploader = ({ fileUrl, fileName }: GoogleDriveUploaderProps) => {
  const { toast } = useToast();

  const uploadToGoogleDrive = async (accessToken: string) => {
    try {
      // First, fetch the file from the Supabase URL
      const response = await fetch(fileUrl);
      const blob = await response.blob();

      // Create form data for the Google Drive API
      const metadata = {
        name: fileName,
        mimeType: blob.type,
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      // Upload to Google Drive
      const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to Google Drive');
      }

      const result = await uploadResponse.json();
      
      toast({
        title: "Success!",
        description: "File successfully uploaded to Google Drive",
      });

      return result;
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload file to Google Drive. Please try again.",
      });
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      await uploadToGoogleDrive(response.access_token);
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Make sure you're logged into the Google account where you want to upload the file.
        </AlertDescription>
      </Alert>
      
      <Button
        onClick={() => login()}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
      >
        <Upload className="w-4 h-4" />
        Upload to Google Drive
      </Button>
    </div>
  );
};

export default GoogleDriveUploader;