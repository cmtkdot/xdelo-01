import { supabase } from "@/integrations/supabase/client";

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
    
    return { 
      isAuthenticated: true, 
      user,
      googleClientId: GOOGLE_CLIENT_ID // Add this to make it available where needed
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