import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleSheetsConfig } from "./google-sheets/hooks/useGoogleSheetsConfig";
import { AddSpreadsheetForm } from "./google-sheets/AddSpreadsheetForm";
import { SpreadsheetCard } from "./google-sheets/SpreadsheetCard";
import { GoogleSheetsConfigProps } from "./google-sheets/types";
import { MediaItem } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { useGoogleLogin } from '@react-oauth/google';
import { SyncManager } from "./google-sheets/SyncManager";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
].join(' ');

const GoogleSheetsConfigContent = ({ 
  onSpreadsheetIdSet, 
  selectedMedia = [], 
  googleSheetId,
  sheetsConfig = []
}: GoogleSheetsConfigProps) => {
  const { toast } = useToast();
  const {
    spreadsheets,
    handleAddSpreadsheet,
    toggleAutoSync,
    removeSpreadsheet
  } = useGoogleSheetsConfig(selectedMedia);

  const login = useGoogleLogin({
    onSuccess: (response) => {
      localStorage.setItem('google_access_token', response.access_token);
      toast({
        title: "Success",
        description: "Successfully authenticated with Google",
      });
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      toast({
        title: "Error",
        description: "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      });
    },
    scope: GOOGLE_SCOPES,
  });

  // Query to fetch all media or selected media
  const { data: allMedia } = useQuery({
    queryKey: ['all-media', selectedMedia.length],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mediaToSync = selectedMedia.length > 0 
        ? data?.filter(item => selectedMedia.includes(item.id))
        : data;
      
      return (mediaToSync || []).map(item => ({
        ...item,
        metadata: typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata
      })) as MediaItem[];
    },
  });

  // Check if user is authenticated with Google
  const isGoogleAuthenticated = !!localStorage.getItem('google_access_token');

  const handleHeaderMappingComplete = async (mapping: Record<string, string>, spreadsheetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('google_sheets_config')
        .update({ 
          is_headers_mapped: true,
          header_mapping: mapping
        })
        .eq('spreadsheet_id', spreadsheetId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Header mapping completed and initial sync performed",
      });

      onSpreadsheetIdSet(spreadsheetId);
    } catch (error) {
      console.error('Error completing header mapping:', error);
      toast({
        title: "Error",
        description: "Failed to complete header mapping",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!isGoogleAuthenticated ? (
          <Button
            onClick={() => login()}
            className="w-full bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Connect Google Account
          </Button>
        ) : (
          <AddSpreadsheetForm onSubmit={handleAddSpreadsheet} />
        )}
      </div>

      {isGoogleAuthenticated && (
        <>
          <div className="grid gap-4">
            {spreadsheets.map((sheet) => (
              <SpreadsheetCard
                key={sheet.id}
                sheet={sheet}
                onToggleAutoSync={toggleAutoSync}
                onRemove={removeSpreadsheet}
                onHeaderMappingComplete={(mapping) => handleHeaderMappingComplete(mapping, sheet.id)}
              />
            ))}
          </div>

          <SyncManager 
            spreadsheets={spreadsheets}
            allMedia={allMedia}
          />
        </>
      )}
    </div>
  );
};

export const GoogleSheetsConfig = (props: GoogleSheetsConfigProps) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  useEffect(() => {
    if (!clientId) {
      console.error('Google Client ID is not set. Please check your environment variables.');
    }
  }, [clientId]);

  if (!clientId) {
    return (
      <div className="p-4 text-red-500">
        Error: Google Client ID is not configured. Please check your environment variables.
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleSheetsConfigContent {...props} />
    </GoogleOAuthProvider>
  );
};