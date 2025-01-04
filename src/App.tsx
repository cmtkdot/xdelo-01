import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Messages from "./pages/Messages";
import Media from "./pages/Media";
import MediaTable from "./pages/MediaTable";
import MediaData from "./pages/MediaData";
import GoogleSheet from "./pages/GoogleSheet";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Webhooks from "./pages/Webhooks";
import AiChat from "./pages/AiChat";
import DatabaseChat from "./pages/DatabaseChat";
import Glide from "./pages/Glide";
import { Toaster } from "./components/ui/toaster";
import { SidebarProvider } from "./components/ui/sidebar";

const queryClient = new QueryClient();
const GOOGLE_CLIENT_ID = "241566560647-0ovscpbnp0r9767brrb14dv6gjfq5uc4.apps.googleusercontent.com";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      }
    });
  }, [navigate]);

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Router>
            <SidebarProvider>
            <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-blue-100/50 to-indigo-100/50 dark:from-blue-900 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
              {/* Animated background elements - tech-inspired for both modes */}
              <div className="fixed inset-0 pointer-events-none">
                {/* Dot pattern - tech grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.1)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                
                {/* Gradient orbs - more vibrant in light mode */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-indigo-400/30 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gradient-to-r from-indigo-400/30 to-purple-400/30 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-full blur-3xl animate-float delay-1000"></div>
                
                {/* Tech-inspired accent lines */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,rgba(59,130,246,0.1),transparent)] dark:bg-[radial-gradient(circle_500px_at_50%_200px,rgba(59,130,246,0.05),transparent)]"></div>
              </div>
              
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <div className="flex flex-col relative z-10">
                        <Navigation />
                        <main className="flex-1 p-4 md:p-8 mt-16 container mx-auto">
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/messages" element={<Messages />} />
                            <Route path="/media" element={<Media />} />
                            <Route path="/media-table" element={<MediaTable />} />
                            <Route path="/media-data" element={<MediaData />} />
                            <Route path="/google-sheet" element={<GoogleSheet />} />
                            <Route path="/webhooks" element={<Webhooks />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/ai-chat" element={<AiChat />} />
                            <Route path="/database-chat" element={<DatabaseChat />} />
                            <Route path="/glide" element={<Glide />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </main>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <Toaster />
            </div>
            </SidebarProvider>
          </Router>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
