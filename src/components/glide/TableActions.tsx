import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PlusCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { GlideTableConfig } from "./types";
import { AddGlideAppDialog } from "./AddGlideAppDialog";

interface TableActionsProps {
  onAddRow: () => void;
  onSync: () => void;
  isAddingRow: boolean;
  selectedTableConfig: GlideTableConfig | null;
}

export function TableActions({ 
  onAddRow, 
  onSync,
  isAddingRow, 
  selectedTableConfig 
}: TableActionsProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!selectedTableConfig) return;

    setIsSyncing(true);
    try {
      await onSync();
    } catch (error) {
      console.error('Error syncing table:', error);
      toast({
        title: "Error",
        description: "Failed to sync table",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    if (!selectedTableConfig) return;

    try {
      const { error } = await supabase
        .from('glide_table_configs')
        .update({ 
          sync_interval: enabled ? 3600 : null // 1 hour in seconds
        })
        .eq('id', selectedTableConfig.id);

      if (error) throw error;

      setAutoSync(enabled);
      toast({
        title: "Success",
        description: `Auto-sync ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating auto-sync:', error);
      toast({
        title: "Error",
        description: "Failed to update auto-sync setting",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <AddGlideAppDialog />
      
      <Button
        variant="outline"
        onClick={onAddRow}
        disabled={isAddingRow || !selectedTableConfig}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Row
      </Button>

      <Button
        variant="outline"
        onClick={handleSync}
        disabled={isSyncing || !selectedTableConfig}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        Sync Now
      </Button>

      <div className="flex items-center space-x-2">
        <Switch
          id="auto-sync"
          checked={autoSync}
          onCheckedChange={handleAutoSyncToggle}
          disabled={!selectedTableConfig}
        />
        <Label htmlFor="auto-sync">Auto-sync</Label>
      </div>
    </div>
  );
}