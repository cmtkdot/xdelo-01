import { format } from "date-fns";
import { Link2, Loader2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { MediaItem } from "../types";
import { MediaTableActions } from "./MediaTableActions";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface MediaTableRowProps {
  item: MediaItem;
  onOpenFile: (url: string) => void;
  isSelected: boolean;
  onToggleSelect: (e?: React.MouseEvent) => void;
  onDelete: () => void;
}

export const MediaTableRow = ({ 
  item, 
  onOpenFile, 
  isSelected,
  onToggleSelect,
  onDelete
}: MediaTableRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(item.caption || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  // Prioritize URLs in this order: Google Drive > Public URL > File URL
  const fileUrl = item.google_drive_url || item.public_url || item.file_url;

  const handleRowClick = (e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement && 
      (e.target.closest('button') || e.target.closest('a') || e.target.closest('input'))
    ) {
      return;
    }
    
    const syntheticEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
    });
    
    onToggleSelect(syntheticEvent as unknown as React.MouseEvent);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    const syntheticEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
    });
    
    onToggleSelect(syntheticEvent as unknown as React.MouseEvent);
  };

  const handleCaptionDoubleClick = () => {
    setIsEditing(true);
  };

  const handleCaptionSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('media')
        .update({ caption })
        .eq('id', item.id);

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
      setCaption(item.caption || "");
    }
  };

  const messageId = typeof item.metadata === 'object' && item.metadata !== null 
    ? (item.metadata as Record<string, any>).message_id 
    : undefined;

  return (
    <TableRow 
      className={`hover:bg-white/5 cursor-pointer ${isSelected ? 'bg-white/10' : ''}`}
      onClick={handleRowClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div onClick={handleCheckboxClick}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => {}}
            className="bg-white/20 border-white/30 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
        </div>
      </TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">{item.media_type}</TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">{item.chat?.title || 'N/A'}</TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">
        {item.created_at ? format(new Date(item.created_at), 'PPpp') : 'N/A'}
      </TableCell>
      <TableCell className="text-white/70 whitespace-nowrap">
        {item.updated_at ? format(new Date(item.updated_at), 'PPpp') : 'N/A'}
      </TableCell>
      <TableCell className="text-white/70">
        {isEditing ? (
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
        ) : (
          <div 
            className="max-w-[300px] truncate hover:bg-white/5 px-2 py-1 rounded cursor-text" 
            onDoubleClick={handleCaptionDoubleClick}
          >
            {caption || 'No caption'}
          </div>
        )}
      </TableCell>
      <TableCell className="text-white/70">
        <div className="space-y-1">
          {item.google_drive_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenFile(item.google_drive_url!);
              }}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors group w-full"
            >
              <Link2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[300px] group-hover:underline">
                Google Drive
              </span>
            </button>
          )}
          {item.public_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenFile(item.public_url!);
              }}
              className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors group w-full"
            >
              <Link2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[300px] group-hover:underline">
                Public URL
              </span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFile(item.file_url);
            }}
            className="flex items-center gap-2 text-white/70 hover:text-white/90 transition-colors group w-full"
          >
            <Link2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[300px] group-hover:underline">
              Original URL
            </span>
          </button>
        </div>
      </TableCell>
      <TableCell>
        <MediaTableActions
          id={item.id}
          fileUrl={fileUrl}
          fileName={item.file_name}
          chatId={item.chat_id}
          messageId={messageId}
          onView={() => onOpenFile(fileUrl)}
          hasGoogleDrive={!!item.google_drive_url}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
};