import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AISettings } from "@/components/ai-chat/AISettings";
import { AITrainingPanel } from "@/components/ai-chat/AITrainingPanel";
import { ChatInput } from "@/components/ai-chat/ChatInput";
import { ChatMessages, Message } from "@/components/ai-chat/ChatMessages";
import { ChatHeader } from "@/components/ai-chat/ChatHeader";
import { Bot } from "lucide-react";

const AiChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [settings, setSettings] = useState<AISettings>({
    temperature: 0.7,
    maxTokens: 500,
    streamResponse: true,
    model: 'gpt-4o-mini'
  });
  const { toast } = useToast();

  const getTrainingContext = async () => {
    const { data: trainingData, error } = await supabase
      .from('ai_training_data')
      .select('*');

    if (error) {
      console.error('Error fetching training data:', error);
      return '';
    }

    return trainingData?.map(item => 
      `${item.category.toUpperCase()}: ${item.title}\n${item.content}\n---\n`
    ).join('\n') || '';
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newUserMessage: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const trainingContext = await getTrainingContext();

      const { data: nlData, error: nlError } = await supabase.functions.invoke('process-natural-language', {
        body: { 
          message: userMessage,
          settings: settings,
          trainingContext: trainingContext
        },
      });

      if (nlError) {
        throw nlError;
      }

      if (nlData) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: nlData.type === 'sql' 
            ? `I executed the following SQL query:\n\`\`\`sql\n${nlData.query}\n\`\`\`\n\nResults:\n\`\`\`json\n${JSON.stringify(nlData.result, null, 2)}\n\`\`\``
            : nlData.content,
          metadata: {
            type: 'sql',
            query: nlData.query,
            result: nlData.result
          }
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('chat-with-claude', {
        body: { 
          messages: [...messages, newUserMessage],
          settings: settings,
          trainingContext: trainingContext
        },
      });

      if (error) throw error;
      
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
        <ChatHeader
          settings={settings}
          onSettingsChange={setSettings}
          showWebhookConfig={showWebhookConfig}
          onToggleWebhookConfig={() => setShowWebhookConfig(!showWebhookConfig)}
        />
        
        {showWebhookConfig && (
          <div className="p-4 border-b border-white/10 bg-black/20">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Configure Webhooks
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Add webhook URLs to allow the AI to send data to external services
            </p>
          </div>
        )}

        <ChatMessages messages={messages} isLoading={isLoading} />

        <div className="p-4 border-t border-white/10">
          <AITrainingPanel />
          <ChatInput 
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            onSubmit={sendMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default AiChat;