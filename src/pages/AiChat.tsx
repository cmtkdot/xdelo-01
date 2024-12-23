import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Database, Webhook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    type?: 'sql' | 'webhook';
    query?: string;
    result?: any;
  };
}

const AiChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newUserMessage: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // First try to process as natural language command
      const { data: nlData, error: nlError } = await supabase.functions.invoke('process-natural-language', {
        body: { message: userMessage },
      });

      if (nlError) throw nlError;

      if (nlData) {
        // Create assistant message with metadata
        const assistantMessage: Message = {
          role: 'assistant',
          content: nlData.type === 'sql' 
            ? `I executed the following SQL query:\n\`\`\`sql\n${nlData.query}\n\`\`\`\n\nResults:\n\`\`\`json\n${JSON.stringify(nlData.result, null, 2)}\n\`\`\``
            : `I executed the webhook action:\n\`\`\`json\n${JSON.stringify(nlData.action, null, 2)}\n\`\`\`\n\nResult: ${nlData.result}`,
          metadata: nlData
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // Fallback to regular chat if not a command
      console.log('Sending messages to Claude:', [...messages, newUserMessage]);
      
      const { data, error } = await supabase.functions.invoke('chat-with-claude', {
        body: { messages: [...messages, newUserMessage] },
      });

      if (error) throw error;
      
      console.log('Received response from Claude:', data);

      if (data.content) {
        const assistantMessage: Message = { role: 'assistant', content: data.content };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="glass-card min-h-[700px] flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-2xl font-semibold text-white">AI Assistant</h1>
          <p className="text-white/60 text-sm mt-1">
            Chat with an AI that understands your Telegram data, can execute SQL queries, and trigger webhooks
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
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
                      <><Database className="w-4 h-4" /> SQL Query</>
                    ) : (
                      <><Webhook className="w-4 h-4" /> Webhook Action</>
                    )}
                  </div>
                )}
                <p className="text-white/90 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-3 rounded-lg">
                <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question, run a SQL query, or trigger a webhook..."
              className="glass-input flex-1"
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
      </div>
    </div>
  );
};

export default AiChat;