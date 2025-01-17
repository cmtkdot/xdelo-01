import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { checkAuth } from "./lib/auth";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Media from "./pages/Media";
import MediaTable from "./pages/MediaTable";
import MediaData from "./pages/MediaData";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Glide from "./pages/Glide";
import ChannelSync from "./pages/ChannelSync";
import { Toaster } from "./components/ui/toaster";
import { SidebarProvider } from "./components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/ui/theme-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkInitialAuth = async () => {
      const { isAuthenticated: authStatus } = await checkAuth();
      setIsAuthenticated(authStatus);
    };

    checkInitialAuth();
  }, []);

  if (isAuthenticated === null) {
    return null; // Or a loading spinner
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <SidebarProvider>
          <Router>
            {isAuthenticated ? (
              <div className="flex min-h-screen flex-col bg-background text-foreground">
                <Navigation />
                <div className="flex-1 mt-16">
                  <main className="w-full h-full mx-auto max-w-[2000px] px-4">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/media" element={<Media />} />
                      <Route path="/channel-sync" element={<ChannelSync />} />
                      <Route path="/media-table" element={<MediaTable />} />
                      <Route path="/media-data" element={<MediaData />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/glide" element={<Glide />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </main>
                </div>
              </div>
            ) : (
              <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
                <div className="w-full max-w-[420px]">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                  </Routes>
                </div>
              </div>
            )}
            <Toaster />
          </Router>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;