import { 
  Home,
  MessageSquare,
  Image,
  Settings,
  Bot,
  FileSpreadsheet,
} from "lucide-react";

export const navigationItems = [
  { href: "/", name: "Dashboard", icon: Home },
  { href: "/messages", name: "Messages", icon: MessageSquare },
  { href: "/media", name: "Media", icon: Image },
  { href: "/media-table", name: "Media Table", icon: FileSpreadsheet },
  { href: "/ai-chat", name: "AI Chat", icon: Bot },
  { href: "/settings", name: "Settings", icon: Settings },
];