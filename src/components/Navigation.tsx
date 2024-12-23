import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import NavigationItems from "./navigation/NavigationItems";
import MobileNavigation from "./navigation/MobileNavigation";
import LogoutButton from "./navigation/LogoutButton";
import ExportButton from "./navigation/ExportButton";
import { ThemeToggle } from "./ThemeToggle";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

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
              <NavigationItems className="flex space-x-2" />
              {location.pathname === '/media-table' && (
                <ExportButton className="text-white hover:bg-white/10 transition-colors" />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
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