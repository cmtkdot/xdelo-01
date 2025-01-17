import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Navigation from '@/components/Navigation';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Media from '@/pages/Media';
import MediaTable from '@/pages/MediaTable';
import Messages from '@/pages/Messages';
import Settings from '@/pages/Settings';
import Glide from '@/pages/Glide';
import GlideApps from '@/pages/GlideApps';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/media" element={<Media />} />
          <Route path="/media-table" element={<MediaTable />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/glide" element={<Glide />} />
          <Route path="/glide-apps" element={<GlideApps />} />
        </Routes>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;