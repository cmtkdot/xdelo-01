import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Messages from "./pages/Messages";
import Media from "./pages/Media";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Webhooks from "./pages/Webhooks";
import { Toaster } from "./components/ui/toaster";
import { SidebarProvider } from "./components/ui/sidebar";

const queryClient = new QueryClient();

// Protected Route wrapper
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
      <Router>
        <SidebarProvider>
          <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-black to-black">
            {/* Animated background elements */}
            <div className="fixed inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float delay-1000"></div>
            </div>
            
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <div className="flex flex-col relative z-10">
                      <Navigation />
                      <main className="flex-1 p-4 md:p-8 mt-16">
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/messages" element={<Messages />} />
                          <Route path="/media" element={<Media />} />
                          <Route path="/webhooks" element={<Webhooks />} />
                          <Route path="/settings" element={<Settings />} />
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
    </QueryClientProvider>
  );
}

export default App;