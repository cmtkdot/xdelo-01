import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const initGoogleSheetsAPI = async () => {
  try {
    if (!window.gapi?.client?.sheets) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        document.body.appendChild(script);
      });

      await new Promise((resolve) => window.gapi.load('client', resolve));
      
      const { data: { api_key }, error } = await supabase.functions.invoke('get-google-api-key');
      if (error) throw error;
      
      await window.gapi.client.init({
        apiKey: api_key,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      });

      console.log('Google Sheets API initialized successfully');
    }

    return true;
  } catch (error) {
    console.error('Error initializing Google Sheets API:', error);
    throw error;
  }
};

export const handleGoogleAuthSuccess = (response: any) => {
  const accessToken = response.access_token;
  localStorage.setItem('google_access_token', accessToken);
  return accessToken;
};

export const handleGoogleAuthError = (error: any) => {
  console.error('Google Auth Error:', error);
  localStorage.removeItem('google_access_token');
  throw error;
};