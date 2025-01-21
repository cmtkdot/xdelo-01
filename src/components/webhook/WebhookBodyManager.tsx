import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WebhookBodyManagerProps {
  body: string;
  onBodyChange: (body: string) => void;
}

const WebhookBodyManager = ({ body, onBodyChange }: WebhookBodyManagerProps) => {
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onBodyChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <Label>Request Body (JSON)</Label>
      <Textarea
        value={body}
        onChange={handleBodyChange}
        placeholder="Enter JSON body"
        className="min-h-[200px] font-mono bg-white/5 border-white/10 text-white"
      />
    </div>
  );
};

export default WebhookBodyManager;