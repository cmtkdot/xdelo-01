import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { handleAuthError, cleanupUserSession } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      // Clean up any existing sessions on login page load
      await cleanupUserSession();
      
      // Check initial auth state
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
      setIsLoading(false);
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);
      
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      } else if (event === 'SIGNED_OUT') {
        await cleanupUserSession();
      } else if (event === 'USER_UPDATED') {
        // Handle user updates (e.g., email verification)
        if (session) {
          navigate("/dashboard");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuthStateChange = async (event: string, session: any) => {
    if (event === 'SIGNED_IN' && session) {
      try {
        // Verify the session is valid
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          const { title, description } = handleAuthError(error);
          toast({
            title,
            description,
            variant: "destructive",
          });
          return;
        }

        if (user) {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0A0F] flex items-center justify-center">
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-900/10 to-[#0A0A0F]">
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.075)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        </div>
        
        {/* Subtle animated borders */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
      </div>

      <div className="relative w-full sm:w-[600px] lg:w-[800px] xl:w-[1000px] mx-auto px-4">
        <div className="relative backdrop-blur-xl bg-black/40 rounded-2xl border border-white/10 p-8 lg:p-12 shadow-2xl">
          <div className="flex flex-col items-center justify-center mb-8 lg:mb-12">
            <img 
              src="/lovable-uploads/ed1ad7fe-b108-4e36-8479-42df7f19fd63.png"
              alt="Logo"
              className="w-32 lg:w-40 h-auto"
            />
          </div>

          <div className="max-w-md mx-auto flex flex-col items-center">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#3b82f6",
                      brandAccent: "#2563eb",
                      defaultButtonBackground: "rgba(0,0,0,0.4)",
                      defaultButtonBackgroundHover: "rgba(0,0,0,0.6)",
                      inputBackground: "rgba(0, 0, 0, 0.2)",
                      inputBorder: "rgba(255, 255, 255, 0.1)",
                      inputBorderHover: "rgba(59, 130, 246, 0.5)",
                      inputBorderFocus: "#3b82f6",
                    },
                  },
                },
                className: {
                  container: "text-white w-full flex flex-col items-center",
                  label: "text-white/90 text-sm font-medium mb-1.5 self-start",
                  button: "bg-blue-500 hover:bg-blue-600 text-white w-full py-2.5 rounded-lg transition-colors font-medium",
                  input: "bg-black/20 border border-white/10 text-white w-full px-3 py-2.5 rounded-lg placeholder:text-white/30 focus:border-blue-500/50 transition-all mb-4",
                  anchor: "text-blue-400 hover:text-blue-300 transition-colors text-sm",
                  divider: "text-white/30 w-full text-center",
                  message: "text-white bg-red-500/90 backdrop-blur-sm p-3 rounded-lg text-sm w-full",
                },
              }}
              providers={[]}
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default Login;
