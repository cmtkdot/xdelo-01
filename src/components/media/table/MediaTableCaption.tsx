import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface MediaTableCaptionProps {
  id: string;
  initialCaption?: string;
}

export const MediaTableCaption = ({ id, initialCaption }: MediaTableCaptionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(initialCaption || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleCaptionSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('media')
        .update({ caption })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Caption updated",
        description: "The caption has been successfully updated",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating caption:', error);
      toast({
        title: "Error",
        description: "Failed to update caption. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCaptionSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCaption(initialCaption || "");
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 max-w-[300px]" onClick={(e) => e.stopPropagation()}>
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="bg-black/40 border-white/20 text-white/90"
        />
        {isSaving && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
      </div>
    );
  }

  return (
    <div 
      className="max-w-[300px] truncate hover:bg-white/5 px-2 py-1 rounded cursor-text" 
      onDoubleClick={() => setIsEditing(true)}
    >
      {caption || 'No caption'}
    </div>
  );
};