import { Home, Image, MessageSquare, Settings, Table, Database, Bot } from "lucide-react";

export const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "Media",
    href: "/media",
    icon: Image,
  },
  {
    name: "Media Data",
    href: "/media-data",
    icon: Database,
  },
  {
    name: "Media Table",
    href: "/media-table",
    icon: Table,
  },
  {
    name: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    name: "AI Chat",
    href: "/ai-chat",
    icon: Bot,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];