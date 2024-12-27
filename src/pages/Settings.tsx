import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const Settings = () => {
  const components = [
    { name: "Messages", path: "/messages", externalUrl: "https://xdelo.lovable.app/messages" },
    { name: "Media", path: "/media", externalUrl: "https://xdelo.lovable.app/media" },
    { name: "Media Table", path: "/media-table", externalUrl: "https://xdelo.lovable.app/media-table" },
    { name: "Media Data", path: "/media-data", externalUrl: "https://xdelo.lovable.app/media-data" },
    { name: "Google Sheet", path: "/google-sheet", externalUrl: "https://xdelo.lovable.app/google-sheet" },
    { name: "Webhooks", path: "/webhooks", externalUrl: "https://xdelo.lovable.app/webhooks" },
    { name: "AI Chat", path: "/ai-chat", externalUrl: "https://xdelo.lovable.app/ai-chat" },
    { name: "Database Chat", path: "/database-chat", externalUrl: "https://xdelo.lovable.app/database-chat" },
  ];

  return (
    <div className="container mx-auto p-4 space-y-4">
      {components.map((component) => (
        <div key={component.path} className="flex gap-4">
          <Link to={component.path} className="block flex-1">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardContent className="p-6">
                <span className="text-lg text-foreground">{component.name}</span>
              </CardContent>
            </Card>
          </Link>
          <a 
            href={component.externalUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center px-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      ))}
    </div>
  );
};

export default Settings;