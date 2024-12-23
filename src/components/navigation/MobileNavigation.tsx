import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavigationItems } from "./NavigationItems";
import LogoutButton from "./LogoutButton";
import ExportButton from "./ExportButton";
import { useLocation } from "react-router-dom";

interface MobileNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
}

const MobileNavigation = ({ isOpen, onToggle }: MobileNavigationProps) => {
  const location = useLocation();

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      <nav className={cn(
        "fixed top-0 left-0 h-full w-64 backdrop-blur-xl bg-black/40 border-r border-white/10 transform transition-transform duration-300 ease-out z-40 md:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <img 
              src="/lovable-uploads/ed1ad7fe-b108-4e36-8479-42df7f19fd63.png"
              alt="Logo"
              className="h-8 w-auto"
            />
          </div>

          <div className="flex-1 px-2">
            <NavigationItems onClick={onToggle} />
            {location.pathname === '/media-table' && (
              <ExportButton className="w-full justify-start text-white hover:bg-white/10 mb-1 transition-colors" />
            )}
          </div>

          <div className="p-4">
            <LogoutButton className="w-full justify-start" />
          </div>
        </div>
      </nav>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default MobileNavigation;