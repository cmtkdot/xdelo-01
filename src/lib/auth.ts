import { supabase } from "@/integrations/supabase/client";

export const checkAuth = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    
    if (!session?.user) {
      return { isAuthenticated: false, user: null };
    }

    return { 
      isAuthenticated: true, 
      user: session.user 
    };
  } catch (error) {
    console.error('Auth check failed:', error);
    return { 
      isAuthenticated: false, 
      user: null, 
      error 
    };
  }
};