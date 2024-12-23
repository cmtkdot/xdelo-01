import { QueryResultChart } from "./QueryResultChart";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "./ChatMessages";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const [showVisualization, setShowVisualization] = useState(false);
  
  // More strict check for visualizable data
  const hasVisualizableData = () => {
    if (message.metadata?.type !== 'sql' || !message.metadata?.result) return false;
    
    const data = message.metadata.result;
    if (!Array.isArray(data) || data.length === 0) return false;
    
    // Only show visualization if there are multiple numeric values to compare
    const numericValues = Object.values(data[0]).filter(value => typeof value === 'number');
    return numericValues.length > 1 && data.length > 1;
  };
  
  const hasVisualization = hasVisualizableData();
  const hasImage = message.metadata?.type === 'image' && message.metadata.imageUrl;

  const toggleVisualization = () => {
    setShowVisualization(!showVisualization);
  };

  return (
    <div
      className={`flex ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      } mb-4`}
    >
      <div
        className={`max-w-[80%] p-4 rounded-lg ${
          message.role === 'user'
            ? 'bg-purple-500/20 ml-auto'
            : 'bg-white/5'
        }`}
      >
        <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
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
          <div className="mt-4">
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
              <div className="mt-2">
                <QueryResultChart data={message.metadata.result} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};