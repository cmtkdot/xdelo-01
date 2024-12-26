import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Settings = () => {
  const components = [
    { name: "Messages", path: "/messages" },
    { name: "Media", path: "/media" },
    { name: "Media Table", path: "/media-table" },
    { name: "Media Data", path: "/media-data" },
    { name: "Google Sheet", path: "/google-sheet" },
    { name: "Webhooks", path: "/webhooks" },
    { name: "AI Chat", path: "/ai-chat" },
    { name: "Database Chat", path: "/database-chat" },
  ];

  return (
    <div className="container mx-auto p-4 space-y-4">
      {components.map((component) => (
        <Link key={component.path} to={component.path} className="block w-full">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
            <CardContent className="p-6">
              <span className="text-lg text-foreground">{component.name}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default Settings;