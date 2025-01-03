import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSheetsConfigContent } from "./google-sheets/GoogleSheetsConfigContent";
import { GoogleSheetsConfigProps } from "./google-sheets/types";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

export const GoogleSheetsConfig = (props: GoogleSheetsConfigProps) => {
  const { toast } = useToast();
  
  const { data: clientId } = useQuery({
    queryKey: ['google-client-id'],
    queryFn: async () => {
      const { data: { api_key }, error } = await supabase.functions.invoke('get-google-api-key');
      if (error) throw error;
      return api_key;
    },
  });

  useEffect(() => {
    const initGoogleApi = async () => {
      try {
        if (!window.gapi?.client?.sheets) {
          await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            document.body.appendChild(script);
          });

          await new Promise((resolve) => window.gapi.load('client', resolve));
          
          await window.gapi.client.init({
            apiKey: clientId,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          });

          console.log('Google Sheets API initialized successfully');
        }
      } catch (error) {
        console.error('Error initializing Google Sheets API:', error);
        toast({
          title: "Error",
          description: "Failed to initialize Google Sheets API. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (clientId) {
      initGoogleApi();
    }
  }, [clientId, toast]);

  return <GoogleSheetsConfigContent {...props} />;
};