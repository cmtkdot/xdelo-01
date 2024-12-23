import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Save } from "lucide-react";
import { TablesInsert } from "@/integrations/supabase/types";

type TrainingDataInsert = TablesInsert<'ai_training_data'>;

export const AITrainingPanel = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const handleSave = async () => {
    if (!category || !title || !content) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ai_training_data')
        .insert<TrainingDataInsert>({
          category,
          title,
          content,
          user_id: (await supabase.auth.getUser()).data.user?.id as string,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Training data saved successfully",
      });

      setIsAdding(false);
      setCategory("");
      setTitle("");
      setContent("");
    } catch (error) {
      console.error("Error saving training data:", error);
      toast({
        title: "Error",
        description: "Failed to save training data",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        onClick={() => setIsAdding(true)}
        className="w-full bg-purple-500/20 hover:bg-purple-500/30"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Training Data
      </Button>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-black/20 rounded-lg border border-white/10">
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sql_example">SQL Example</SelectItem>
          <SelectItem value="documentation">Documentation</SelectItem>
          <SelectItem value="conversation">Conversation</SelectItem>
          <SelectItem value="background">Background Knowledge</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-black/40 border-white/10"
      />

      <Textarea
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[200px] bg-black/40 border-white/10"
      />

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-purple-500 hover:bg-purple-600"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsAdding(false)}
          className="border-white/10 hover:bg-white/5"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
