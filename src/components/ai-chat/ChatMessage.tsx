import { QueryResultChart } from "./QueryResultChart";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    type?: 'sql' | 'webhook';
    query?: string;
    result?: any;
  };
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
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
            ) : (
              <>Webhook Action</>
            )}
          </div>
        )}
        <p className="text-white/90 whitespace-pre-wrap">
          {message.content}
        </p>
        {message.metadata?.type === 'sql' && message.metadata.result && (
          <QueryResultChart data={message.metadata.result} />
        )}
      </div>
    </div>
  );
};