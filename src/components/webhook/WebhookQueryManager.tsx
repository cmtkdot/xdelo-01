import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

export interface QueryParam {
  key: string;
  value: string;
}

interface WebhookQueryManagerProps {
  params: QueryParam[];
  onParamsChange: (params: QueryParam[]) => void;
}

const WebhookQueryManager = ({ params, onParamsChange }: WebhookQueryManagerProps) => {
  const [newParamKey, setNewParamKey] = useState("");
  const [newParamValue, setNewParamValue] = useState("");

  const addParam = () => {
    if (newParamKey.trim() && newParamValue.trim()) {
      onParamsChange([...params, { key: newParamKey, value: newParamValue }]);
      setNewParamKey("");
      setNewParamValue("");
    }
  };

  const removeParam = (index: number) => {
    const newParams = params.filter((_, i) => i !== index);
    onParamsChange(newParams);
  };

  return (
    <div className="space-y-4">
      <Label>Query Parameters</Label>
      <div className="space-y-2">
        {params.map((param, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={param.key}
              onChange={(e) => {
                const newParams = [...params];
                newParams[index].key = e.target.value;
                onParamsChange(newParams);
              }}
              placeholder="Parameter key"
              className="flex-1"
            />
            <Input
              value={param.value}
              onChange={(e) => {
                const newParams = [...params];
                newParams[index].value = e.target.value;
                onParamsChange(newParams);
              }}
              placeholder="Parameter value"
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeParam(index)}
              className="h-10 w-10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={newParamKey}
          onChange={(e) => setNewParamKey(e.target.value)}
          placeholder="New parameter key"
          className="flex-1"
        />
        <Input
          value={newParamValue}
          onChange={(e) => setNewParamValue(e.target.value)}
          placeholder="New parameter value"
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={addParam}
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default WebhookQueryManager;