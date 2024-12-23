import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AISettingsPanel, AISettings } from "@/components/ai-chat/AISettings";
import { AITrainingPanel } from "@/components/ai-chat/AITrainingPanel";
import { ChatInput } from "@/components/ai-chat/ChatInput";
import { ChatMessages } from "@/components/ai-chat/ChatMessages";

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
  const [settings, setSettings] = useState<AISettings>({
    temperature: 0.7,
    maxTokens: 500,
    streamResponse: true
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleWebhookError = (error: any) => {
    if (error.body && typeof error.body === 'string') {
      try {
        const parsedError = JSON.parse(error.body);
        if (parsedError.error === 'No webhook URLs configured. Please add a webhook URL first.') {
          toast({
            title: "Webhook Configuration Required",
            description: (
              <div className="flex flex-col gap-2">
                <p>No webhook URLs are configured. Please add a webhook URL first.</p>
                <button
                  onClick={() => navigate('/webhooks')}
                  className="text-blue-500 hover:text-blue-600 underline"
                >
                  Go to Webhook Configuration
                </button>
              </div>
            ),
            variant: "destructive",
          });
          return true;
        }
      } catch (e) {
        console.error('Error parsing error body:', e);
      }
    }
    return false;
  };

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
        if (!handleWebhookError(nlError)) {
          throw nlError;
        }
        return;
      }

      if (nlData) {
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
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-white">AI Assistant</h1>
            <p className="text-white/60 text-sm mt-1">
              Chat with an AI that understands your data, executes SQL queries, and triggers webhooks
            </p>
          </div>
          <AISettingsPanel settings={settings} onSettingsChange={setSettings} />
        </div>
        
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