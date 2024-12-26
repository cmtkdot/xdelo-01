export interface Suggestion {
  key: string;
  value: string;
  description?: string;
}

export interface SuggestionProps {
  suggestions: Suggestion[];
  value: string;
  onSelect: (suggestion: Suggestion) => void;
  placeholder?: string;
  triggerClassName?: string;
}