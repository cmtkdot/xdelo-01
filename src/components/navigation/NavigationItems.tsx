import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home,
  MessageSquare,
  Image,
  Settings,
  Webhook,
  Bot,
  FileSpreadsheet,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/messages", icon: MessageSquare, label: "Messages" },
  { path: "/media", icon: Image, label: "Media" },
  { path: "/media-table", icon: FileSpreadsheet, label: "Media Table" },
  { path: "/webhooks", icon: Webhook, label: "Webhooks" },
  { path: "/ai-chat", icon: Bot, label: "AI Chat" },
  { path: "/database-chat", icon: Database, label: "Database Chat" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

interface NavigationItemsProps {
  onClick?: () => void;
  className?: string;
}

const NavigationItems = ({ onClick, className }: NavigationItemsProps) => {
  const location = useLocation();

  return (
    <div className={className}>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClick}
        >
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white hover:bg-white/10 mb-1 transition-colors",
              location.pathname === item.path && "bg-white/10 border border-white/20"
            )}
          >
            <item.icon className="w-4 h-4 mr-2" />
            {item.label}
          </Button>
        </Link>
      ))}
    </div>
  );
};

export default NavigationItems;