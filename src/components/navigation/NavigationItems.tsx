import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home,
  Image,
  MessageSquare,
  Settings,
  FileSpreadsheet,
  RefreshCw,
  Database,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navItems = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/media", icon: Image, label: "Media Gallery" },
  { path: "/media-table", icon: FileSpreadsheet, label: "Media Table" },
  { path: "/messages", icon: MessageSquare, label: "Messages" },
  { path: "/channel-sync", icon: RefreshCw, label: "Channel Sync" },
  { path: "/webhooks", icon: Webhook, label: "Webhooks" },
  { path: "/database-chat", icon: Database, label: "Database" },
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
              "w-full justify-start text-white hover:bg-white/10 mb-1.5 transition-colors",
              location.pathname === item.path && "bg-white/10 border border-white/20 shadow-sm"
            )}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
          </Button>
        </Link>
      ))}
    </div>
  );
};

export default NavigationItems;