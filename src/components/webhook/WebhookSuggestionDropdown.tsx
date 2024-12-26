import React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import SuggestionItem from "./components/SuggestionItem";
import { SuggestionProps } from "./types/webhookTypes";

const WebhookSuggestionDropdown = ({
  suggestions = [],
  value = "",
  onSelect,
  placeholder = "Select from suggestions...",
  triggerClassName,
}: SuggestionProps) => {
  const [open, setOpen] = React.useState(false);
  const validSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const selectedSuggestion = validSuggestions.find((s) => s.key === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between bg-white/5 border-white/10 text-white hover:bg-white/10",
            triggerClassName
          )}
        >
          {selectedSuggestion?.key || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-black/90 border-white/10">
        <Command>
          <CommandInput 
            placeholder="Search suggestions..." 
            className="h-9 bg-transparent text-white" 
          />
          <CommandEmpty>No suggestion found.</CommandEmpty>
          <CommandGroup>
            {validSuggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.key}
                suggestion={suggestion}
                isSelected={value === suggestion.key}
                onSelect={(selected) => {
                  onSelect(selected);
                  setOpen(false);
                }}
              />
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default WebhookSuggestionDropdown;