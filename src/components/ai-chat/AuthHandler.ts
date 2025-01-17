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
      // Attempt to refresh the token using the refresh token if available
      const refreshToken = localStorage.getItem('google_refresh_token');
      if (refreshToken) {
        try {
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('google_access_token', data.access_token);
            const newExpiry = new Date().getTime() + (data.expires_in * 1000);
            localStorage.setItem('google_token_expiry', newExpiry.toString());
            return { 
              isAuthenticated: true, 
              user,
              googleClientId: GOOGLE_CLIENT_ID,
              needsGoogleReauth: false 
            };
          }
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
        }
      }
      
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
  const refreshToken = localStorage.getItem('google_refresh_token');
  
  if (!token || !expiry) {
    return { isValid: false, reason: 'No token found', canRefresh: !!refreshToken };
  }
  
  const expiryTime = parseInt(expiry);
  const currentTime = new Date().getTime();
  
  if (currentTime > expiryTime) {
    return { isValid: false, reason: 'Token expired', canRefresh: !!refreshToken };
  }
  
  return { isValid: true, canRefresh: !!refreshToken };
};

// Add function to clear Google auth data
export const clearGoogleAuth = () => {
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_token_expiry');
  // Don't remove refresh token to allow automatic re-authentication
};

// Add function to store Google auth data
export const storeGoogleAuth = (response: any) => {
  localStorage.setItem('google_access_token', response.access_token);
  const expiryTime = new Date().getTime() + (response.expires_in * 1000);
  localStorage.setItem('google_token_expiry', expiryTime.toString());
  if (response.refresh_token) {
    localStorage.setItem('google_refresh_token', response.refresh_token);
  }
};