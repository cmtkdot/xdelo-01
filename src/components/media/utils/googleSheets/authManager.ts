import { supabase } from "@/integrations/supabase/client";

export type AuthMethod = 'oauth' | 'service_account';

export const getGoogleAuthMethod = async (): Promise<AuthMethod> => {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = localStorage.getItem('google_access_token');
  
  if (accessToken) {
    return 'oauth';
  }
  return 'service_account';
};

export const getGoogleAccessToken = async (): Promise<string> => {
  const authMethod = await getGoogleAuthMethod();
  
  if (authMethod === 'oauth') {
    const accessToken = localStorage.getItem('google_access_token');
    if (!accessToken) {
      throw new Error('No Google access token found. Please authenticate.');
    }
    return accessToken;
  }
  
  // Use service account as fallback
  const { data: credentials, error } = await supabase.functions.invoke('get-service-account-token');
  if (error) {
    throw new Error('Failed to get service account token');
  }
  return credentials.access_token;
};