import { Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ChatInput = ({ input, setInput, isLoading, onSubmit }: ChatInputProps) => {
  return (
    <form onSubmit={onSubmit} className="mt-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question, run a SQL query, or trigger a webhook..."
          className="glass-input flex-1 text-white placeholder:text-white/60"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="glass-button"
          disabled={isLoading || !input.trim()}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};