import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function AddGlideAppDialog() {
  const [appId, setAppId] = useState("");
  const [appName, setAppName] = useState("");
  const [tableId, setTableId] = useState("");
  const [tableName, setTableName] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // First insert the Glide app
      const { data: appData, error: appError } = await supabase
        .from('glide_apps')
        .insert([{
          app_id: appId,
          app_name: appName,
          is_active: true
        }])
        .select()
        .single();

      if (appError) throw appError;

      // Then insert the table configuration
      const { error: tableError } = await supabase
        .from('glide_table_configs')
        .insert([{
          app_id: appData.id,
          table_id: tableId,
          table_name: tableName,
          is_active: true
        }]);

      if (tableError) throw tableError;

      toast({
        title: "Success",
        description: "Glide app and table configuration added successfully",
      });

      // Reset form and close dialog
      setAppId("");
      setAppName("");
      setTableId("");
      setTableName("");
      setOpen(false);
    } catch (error) {
      console.error('Error adding Glide app:', error);
      toast({
        title: "Error",
        description: "Failed to add Glide app and table configuration",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Glide App
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Glide App</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appId">App ID</Label>
            <Input
              id="appId"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="Enter Glide App ID"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appName">App Name</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Enter App Name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tableId">Table ID</Label>
            <Input
              id="tableId"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="Enter Table ID"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tableName">Table Name</Label>
            <Input
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter Table Name"
              required
            />
          </div>
          <Button type="submit" className="w-full">Add App & Table</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}