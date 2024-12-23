import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-900/20 to-black">
          <div className="absolute inset-0 bg-[url('/lovable-uploads/0ff424f4-b8ea-40bb-9c6c-dd299e01cf05.png')] bg-cover opacity-10 mix-blend-overlay animate-pulse"></div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse"></div>
      </div>

      {/* Login container */}
      <div className="relative max-w-md w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg blur-xl animate-pulse"></div>
        <div className="relative backdrop-blur-xl bg-black/40 rounded-lg border border-white/10 p-8 shadow-2xl">
          {/* Logo and title */}
          <div className="flex flex-col items-center justify-center gap-4 mb-8">
            <img 
              src="/lovable-uploads/a983b9da-9ed4-4ae4-846a-b605e60fff63.png"
              alt="Xdelo Logo"
              className="w-24 h-24 animate-fade-in"
            />
            <h1 className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Xdelo Manager
            </h1>
            <p className="text-white/60 text-center text-sm">
              Secure access to your media management system
            </p>
          </div>

          {/* Auth component */}
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
                container: "text-white",
                label: "text-white/80",
                button: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200",
                input: "bg-black/20 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 transition-all duration-200",
              },
            }}
            providers={[]}
          />
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-4 left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute top-4 right-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl animate-pulse"></div>
    </div>
  );
};

export default Login;