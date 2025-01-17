import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import NavigationItems from "./NavigationItems";
import LogoutButton from "./LogoutButton";
import ExportButton from "./ExportButton";
import { useLocation } from "react-router-dom";
import { ThemeToggle } from "../ui/theme-toggle";

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
        className="fixed top-4 left-4 z-50 md:hidden text-gray-700 dark:text-white p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      <nav className={cn(
        "fixed top-0 left-0 h-full w-64 backdrop-blur-xl bg-white/90 dark:bg-black/40 border-r border-gray-200/50 dark:border-white/10 transform transition-transform duration-300 ease-out z-40 md:hidden shadow-lg",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md">
              <img 
                src="/lovable-uploads/a983b9da-9ed4-4ae4-846a-b605e60fff63.png"
                alt="Logo Icon"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <img 
              src="/lovable-uploads/ed1ad7fe-b108-4e36-8479-42df7f19fd63.png"
              alt="Logo Text"
              className="h-5 w-auto"
            />
          </div>

          <div className="flex-1 px-3">
            <NavigationItems onClick={onToggle} />
            {location.pathname === '/media-table' && (
              <ExportButton className="w-full justify-start text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 mb-1 transition-colors" />
            )}
          </div>

          <div className="p-4 border-t border-gray-200/50 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Theme</span>
              <ThemeToggle />
            </div>
            <LogoutButton className="w-full justify-center" />
          </div>
        </div>
      </nav>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default MobileNavigation;