import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Media from "./pages/Media";
import MediaData from "./pages/MediaData";
import MediaTable from "./pages/MediaTable";
import Messages from "./pages/Messages";
import AiChat from "./pages/AiChat";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/media" element={<Media />} />
            <Route path="/media-data" element={<MediaData />} />
            <Route path="/media-table" element={<MediaTable />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/ai-chat" element={<AiChat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;