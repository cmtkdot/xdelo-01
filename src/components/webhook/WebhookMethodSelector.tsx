import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface WebhookMethodSelectorProps {
  method: HttpMethod;
  onMethodChange: (method: HttpMethod) => void;
}

const WebhookMethodSelector = ({ method, onMethodChange }: WebhookMethodSelectorProps) => {
  return (
    <Select value={method} onValueChange={(value) => onMethodChange(value as HttpMethod)}>
      <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
        <SelectValue placeholder="Select method" />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-white/10">
        <SelectItem value="GET" className="text-white hover:bg-white/5">GET</SelectItem>
        <SelectItem value="POST" className="text-white hover:bg-white/5">POST</SelectItem>
        <SelectItem value="PUT" className="text-white hover:bg-white/5">PUT</SelectItem>
        <SelectItem value="PATCH" className="text-white hover:bg-white/5">PATCH</SelectItem>
        <SelectItem value="DELETE" className="text-white hover:bg-white/5">DELETE</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default WebhookMethodSelector;