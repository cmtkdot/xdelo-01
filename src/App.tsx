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
      <SidebarProvider>
        <Router>
          {isAuthenticated ? (
            <div className="flex h-screen bg-black">
              <Navigation />
              <main className="flex-1 overflow-y-auto">
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
          ) : (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          )}
          <Toaster />
        </Router>
      </SidebarProvider>
    </QueryClientProvider>
  );
};

export default App;