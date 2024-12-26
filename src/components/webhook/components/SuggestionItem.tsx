import { Check } from "lucide-react";
import { CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Suggestion } from "../types/webhookTypes";

interface SuggestionItemProps {
  suggestion: Suggestion;
  isSelected: boolean;
  onSelect: (suggestion: Suggestion) => void;
}

const SuggestionItem = ({ suggestion, isSelected, onSelect }: SuggestionItemProps) => {
  return (
    <CommandItem
      key={suggestion.key}
      value={suggestion.key}
      onSelect={() => onSelect(suggestion)}
      className="text-white hover:bg-white/10"
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      <div>
        <div>{suggestion.key}</div>
        {suggestion.description && (
          <div className="text-xs text-white/70">{suggestion.description}</div>
        )}
      </div>
    </CommandItem>
  );
};

export default SuggestionItem;