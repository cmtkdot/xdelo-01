import { Checkbox } from "@/components/ui/checkbox";

interface MediaCardCheckboxProps {
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const MediaCardCheckbox = ({ isSelected, onToggleSelect }: MediaCardCheckboxProps) => {
  return (
    <div className="absolute top-1.5 left-1.5 z-10 checkbox-area">
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="h-[18px] w-[18px] bg-white/80 border-gray-300 dark:bg-white/20 dark:border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
      />
    </div>
  );
};