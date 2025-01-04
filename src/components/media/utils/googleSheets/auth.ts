import { supabase } from "@/integrations/supabase/client";

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
        discoveryDocs: [
          'https://sheets.googleapis.com/$discovery/rest?version=v4',
          'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
        ],
      });

      console.log('Google APIs initialized successfully');
    }

    // Get the access token from localStorage
    const accessToken = localStorage.getItem('google_access_token');
    if (!accessToken) {
      throw new Error('No access token found. Please authenticate with Google.');
    }

    // Check token expiration
    const tokenExpiry = localStorage.getItem('google_token_expiry');
    if (tokenExpiry && new Date().getTime() > parseInt(tokenExpiry)) {
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_token_expiry');
      throw new Error('Google access token has expired. Please re-authenticate.');
    }

    // Set the access token for the client
    window.gapi.client.setToken({ access_token: accessToken });

    return true;
  } catch (error) {
    console.error('Error initializing Google APIs:', error);
    throw error;
  }
};