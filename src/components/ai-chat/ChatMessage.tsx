import { QueryResultChart } from "./QueryResultChart";
import { useState } from "react";
import { ChevronDown, ChevronUp, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    type?: 'sql' | 'webhook' | 'image';
    query?: string;
    result?: any;
    imageUrl?: string;
  };
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const [showVisualization, setShowVisualization] = useState(false);
  
  const hasVisualization = message.metadata?.type === 'sql' && message.metadata.result;
  const hasImage = message.metadata?.type === 'image' && message.metadata.imageUrl;

  const toggleVisualization = () => {
    setShowVisualization(!showVisualization);
  };

  return (
    <div
      className={`flex ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          message.role === 'user'
            ? 'bg-purple-500/20 ml-auto'
            : 'bg-white/5'
        }`}
      >
        {message.metadata?.type && (
          <div className="flex items-center gap-2 mb-2 text-sm text-white/60">
            {message.metadata.type === 'sql' ? (
              <>Database Query</> 
            ) : message.metadata.type === 'image' ? (
              <div className="flex items-center gap-1">
                <Image className="w-4 h-4" />
                Image
              </div>
            ) : (
              <>Webhook Action</>
            )}
          </div>
        )}
        
        <p className="text-white/90 whitespace-pre-wrap">
          {message.content}
        </p>

        {hasImage && (
          <div className="mt-4">
            <img 
              src={message.metadata.imageUrl} 
              alt="Query result"
              className="max-w-full rounded-lg"
            />
          </div>
        )}

        {hasVisualization && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisualization}
              className="text-white/60 hover:text-white"
            >
              {showVisualization ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide Visualization
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show Visualization
                </>
              )}
            </Button>
            
            {showVisualization && (
              <QueryResultChart data={message.metadata.result} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};