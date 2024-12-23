import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { 
  Home,
  MessageSquare,
  Image,
  Settings,
  LogOut,
  Webhook,
  Menu,
  Bot
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/messages", icon: MessageSquare, label: "Messages" },
    { path: "/media", icon: Image, label: "Media" },
    { path: "/webhooks", icon: Webhook, label: "Webhooks" },
    { path: "/ai-chat", icon: Bot, label: "AI Chat" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <>
      {/* Desktop Header Navigation */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 h-16 backdrop-blur-xl bg-black/40 border-b border-white/10 z-40 px-4">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/ed1ad7fe-b108-4e36-8479-42df7f19fd63.png"
                alt="Logo"
                className="h-8 w-auto"
              />
            </Link>
            <div className="flex items-center space-x-2">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-white hover:bg-white/10 transition-colors",
                      location.pathname === item.path && "bg-white/10 border border-white/20"
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 h-full w-64 backdrop-blur-xl bg-black/40 border-r border-white/10 transform transition-transform duration-300 ease-out z-40 md:hidden",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/lovable-uploads/ed1ad7fe-b108-4e36-8479-42df7f19fd63.png"
                alt="Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>

          <div className="flex-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
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

          <div className="p-4">
            <Button 
              onClick={handleLogout}
              variant="ghost" 
              className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;
