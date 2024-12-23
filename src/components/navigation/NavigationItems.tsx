import { navigationItems } from "./navigationConfig";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavigationItemsProps {
  className?: string;
  onClick?: () => void;
}

export function NavigationItems({ className, onClick }: NavigationItemsProps) {
  return (
    <nav className={className}>
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onClick}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                "hover:bg-white/10",
                isActive ? "bg-white/10 text-white" : "text-white/60"
              )
            }
          >
            <Icon className="w-4 h-4" />
            <span>{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}