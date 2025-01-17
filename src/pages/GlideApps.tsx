import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle, XCircle, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type GlideApp = Database['public']['Tables']['glide_apps']['Row'];
type GlideTableConfig = Database['public']['Tables']['glide_table_configs']['Row'];

const GlideApps = () => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  // Fetch Glide apps
  const { data: apps, isLoading: isLoadingApps } = useQuery({
    queryKey: ['glide-apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('glide_apps')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as GlideApp[];
    },
  });

  // Fetch table configs for selected app
  const { data: tableConfigs, isLoading: isLoadingTables } = useQuery({
    queryKey: ['glide-table-configs', selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return [];
      const { data, error } = await supabase
        .from('glide_table_configs')
        .select('*')
        .eq('app_id', selectedAppId);

      if (error) throw error;
      return data as GlideTableConfig[];
    },
    enabled: !!selectedAppId,
  });

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('glide-apps-sync', {
        body: { 
          appId: selectedAppId,
          tableId: selectedTableId
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Data synced successfully",
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync data",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddTable = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('add-glide-table', {
        body: { 
          appId: selectedAppId,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "New table configuration added",
      });
    } catch (error) {
      console.error('Error adding table:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add table",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'PP p');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Glide Apps Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your Glide apps synchronization
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAddTable}
            disabled={!selectedAppId}
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Table
          </Button>
          <Button 
            onClick={handleSync} 
            disabled={isSyncing || !selectedTableId}
            className="min-w-[140px]"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-1/2">
          <Select
            value={selectedAppId}
            onValueChange={setSelectedAppId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Glide App" />
            </SelectTrigger>
            <SelectContent>
              {apps?.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.app_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-1/2">
          <Select
            value={selectedTableId}
            onValueChange={setSelectedTableId}
            disabled={!selectedAppId || !tableConfigs?.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Table" />
            </SelectTrigger>
            <SelectContent>
              {tableConfigs?.map((config) => (
                <SelectItem key={config.id} value={config.table_id}>
                  {config.table_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTableId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Sync Direction</h3>
            <Badge variant="secondary" className="text-lg">
              {tableConfigs?.find(c => c.table_id === selectedTableId)?.sync_direction || 'N/A'}
            </Badge>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Last Sync</h3>
            <p className="text-xl">
              {tableConfigs?.find(c => c.table_id === selectedTableId)?.last_synced 
                ? formatDate(tableConfigs.find(c => c.table_id === selectedTableId)?.last_synced || null) 
                : 'Never'}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Status</h3>
            <div className="flex items-center space-x-2">
              {isSyncing ? (
                <Badge variant="secondary" className="text-lg py-1">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing
                </Badge>
              ) : (
                <Badge variant="default" className="text-lg py-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Ready
                </Badge>
              )}
            </div>
          </Card>
        </div>
      )}

      {selectedTableId && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Name</TableHead>
                  <TableHead>Sync Direction</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableConfigs?.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.table_name}</TableCell>
                    <TableCell>{config.sync_direction}</TableCell>
                    <TableCell>{formatDate(config.last_synced)}</TableCell>
                    <TableCell>
                      <Badge variant={config.is_active ? "default" : "secondary"}>
                        {config.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTableId(config.table_id)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default GlideApps;