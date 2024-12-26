import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Settings = () => {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-4">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="space-y-4 p-6">
          <Link 
            to="/media" 
            className="block w-full p-4 rounded-lg bg-black/40 border border-white/10 hover:bg-white/5 transition-colors"
          >
            Media Gallery
          </Link>
          <Link 
            to="/media-table" 
            className="block w-full p-4 rounded-lg bg-black/40 border border-white/10 hover:bg-white/5 transition-colors"
          >
            Media Table
          </Link>
          <Link 
            to="/google-sheet" 
            className="block w-full p-4 rounded-lg bg-black/40 border border-white/10 hover:bg-white/5 transition-colors"
          >
            Google Sheets
          </Link>
          <Link 
            to="/webhooks" 
            className="block w-full p-4 rounded-lg bg-black/40 border border-white/10 hover:bg-white/5 transition-colors"
          >
            Webhooks
          </Link>
          <Link 
            to="/ai-chat" 
            className="block w-full p-4 rounded-lg bg-black/40 border border-white/10 hover:bg-white/5 transition-colors"
          >
            AI Chat
          </Link>
          <Link 
            to="/database-chat" 
            className="block w-full p-4 rounded-lg bg-black/40 border border-white/10 hover:bg-white/5 transition-colors"
          >
            Database Chat
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;