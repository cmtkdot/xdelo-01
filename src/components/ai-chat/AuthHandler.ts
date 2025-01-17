import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

// Add Google client ID constant
const GOOGLE_CLIENT_ID = "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com";

export const checkAuth = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Auth check error:", error);
      throw error;
    }
    
    if (!session) {
      console.log("No session found during auth check");
      return { isAuthenticated: false };
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User verification failed:", userError);
      throw userError || new Error("User not found");
    }

    // Check Google token expiration
    const googleToken = localStorage.getItem('google_access_token');
    const tokenExpiry = localStorage.getItem('google_token_expiry');
    
    if (!googleToken || !tokenExpiry || new Date().getTime() > parseInt(tokenExpiry)) {
      console.log("Google token expired or not found");
      return { 
        isAuthenticated: true, 
        user,
        googleClientId: GOOGLE_CLIENT_ID,
        needsGoogleReauth: true 
      };
    }
    
    return { 
      isAuthenticated: true, 
      user,
      googleClientId: GOOGLE_CLIENT_ID,
      needsGoogleReauth: false
    };
  } catch (error) {
    console.error("Auth check failed:", error);
    return { isAuthenticated: false, error };
  }
};

// Add helper function to initialize Google OAuth
export const initGoogleAuth = () => {
  return {
    googleClientId: GOOGLE_CLIENT_ID
  };
};

// Add function to check Google token status
export const checkGoogleTokenStatus = () => {
  const token = localStorage.getItem('google_access_token');
  const expiry = localStorage.getItem('google_token_expiry');
  
  if (!token || !expiry) {
    return { isValid: false, reason: 'No token found' };
  }
  
  const expiryTime = parseInt(expiry);
  const currentTime = new Date().getTime();
  
  if (currentTime > expiryTime) {
    return { isValid: false, reason: 'Token expired' };
  }
  
  return { isValid: true };
};

// Add function to clear Google auth data
export const clearGoogleAuth = () => {
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_token_expiry');
};