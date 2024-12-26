import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface WebhookScheduleSelectorProps {
  schedule: "manual" | "hourly" | "daily" | "weekly";
  onScheduleChange: (schedule: "manual" | "hourly" | "daily" | "weekly") => void;
}

const WebhookScheduleSelector = ({ schedule, onScheduleChange }: WebhookScheduleSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label>Schedule Type</Label>
      <Select value={schedule} onValueChange={(value: "manual" | "hourly" | "daily" | "weekly") => onScheduleChange(value)}>
        <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
          <SelectValue placeholder="Select schedule" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-white/10">
          <SelectItem value="manual" className="text-white hover:bg-white/5">Manual</SelectItem>
          <SelectItem value="hourly" className="text-white hover:bg-white/5">Hourly</SelectItem>
          <SelectItem value="daily" className="text-white hover:bg-white/5">Daily</SelectItem>
          <SelectItem value="weekly" className="text-white hover:bg-white/5">Weekly</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default WebhookScheduleSelector;