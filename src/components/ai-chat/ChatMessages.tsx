import { Loader2 } from "lucide-react";
import { ChatMessage } from "./ChatMessage";

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    type?: 'sql' | 'image';
    query?: string;
    result?: any;
    imageUrl?: string;
  };
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatMessages = ({ messages, isLoading }: ChatMessagesProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} />
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white/5 p-3 rounded-lg">
            <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
};