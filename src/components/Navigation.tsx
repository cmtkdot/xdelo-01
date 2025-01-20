import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import NavigationItems from "./navigation/NavigationItems";
import MobileNavigation from "./navigation/MobileNavigation";
import LogoutButton from "./navigation/LogoutButton";
import ExportButton from "./navigation/ExportButton";
import { ThemeToggle } from "./ui/theme-toggle";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Navigation Spacer */}
      <div className="h-16" /> {/* This pushes content below fixed header */}
      
      {/* Desktop Header Navigation */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 h-16 backdrop-blur-xl bg-white/90 dark:bg-black/40 border-b border-gray-200/50 dark:border-white/10 z-40 px-4 shadow-sm">
        <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md transition-transform duration-300 group-hover:scale-105">
                <img 
                  src="/lovable-uploads/a983b9da-9ed4-4ae4-846a-b605e60fff63.png"
                  alt="Logo Icon"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <img 
                src="/lovable-uploads/ed1ad7fe-b108-4e36-8479-42df7f19fd63.png"
                alt="Logo Text"
                className="h-5 w-auto transition-opacity duration-300 group-hover:opacity-80"
              />
            </Link>
            <div className="flex items-center gap-2">
              <NavigationItems className="flex gap-2" />
              {location.pathname === '/media-table' && (
                <ExportButton className="text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation 
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
    </>
  );
};

export default Navigation;