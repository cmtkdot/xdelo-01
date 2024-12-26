import React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  key: string;
  value: string;
  description?: string;
}

interface WebhookSuggestionDropdownProps {
  suggestions: Suggestion[];
  value?: string;
  onSelect: (suggestion: Suggestion) => void;
  placeholder?: string;
  triggerClassName?: string;
}

const WebhookSuggestionDropdown = ({
  suggestions,
  value,
  onSelect,
  placeholder = "Select from suggestions...",
  triggerClassName,
}: WebhookSuggestionDropdownProps) => {
  const [open, setOpen] = React.useState(false);

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
          {value ? suggestions.find((s) => s.key === value)?.key : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-black/90 border-white/10">
        <Command>
          <CommandInput placeholder="Search suggestions..." className="h-9 bg-transparent text-white" />
          <CommandEmpty>No suggestion found.</CommandEmpty>
          <CommandGroup>
            {suggestions.map((suggestion) => (
              <CommandItem
                key={suggestion.key}
                value={suggestion.key}
                onSelect={() => {
                  onSelect(suggestion);
                  setOpen(false);
                }}
                className="text-white hover:bg-white/10"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === suggestion.key ? "opacity-100" : "opacity-0"
                  )}
                />
                <div>
                  <div>{suggestion.key}</div>
                  {suggestion.description && (
                    <div className="text-xs text-white/70">{suggestion.description}</div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default WebhookSuggestionDropdown;