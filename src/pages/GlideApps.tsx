import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw, Plus, Trash } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";
import { GlideDataTable } from "@/components/glide/GlideDataTable";

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
        .eq('is_active', true)
        .order('app_name');

      if (error) {
        toast({
          title: "Error fetching apps",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
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
        .eq('app_id', selectedAppId)
        .eq('is_active', true)
        .order('table_name');

      if (error) {
        toast({
          title: "Error fetching tables",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      return data as GlideTableConfig[];
    },
    enabled: !!selectedAppId,
  });

  // Fetch table data for selected table
  const { data: tableData, isLoading: isLoadingTableData, refetch: refetchTableData } = useQuery({
    queryKey: ['glide-table-data', selectedTableId],
    queryFn: async () => {
      if (!selectedTableId) return null;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('glide-apps-sync', {
        body: { 
          operation: { type: 'get' },
          tableConfig: {
            table: selectedTableId
          }
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        toast({
          title: "Error fetching table data",
          description: response.error.message,
          variant: "destructive",
        });
        throw response.error;
      }
      return response.data;
    },
    enabled: !!selectedTableId,
  });

  // Add row mutation
  const addRowMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('glide-apps-sync', {
        body: { 
          operation: { 
            type: 'add',
            data
          },
          tableConfig: {
            table: selectedTableId
          }
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Row added successfully" });
      refetchTableData();
    },
    onError: (error) => {
      toast({
        title: "Error adding row",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete row mutation
  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('glide-apps-sync', {
        body: { 
          operation: { 
            type: 'delete',
            rowId
          },
          tableConfig: {
            table: selectedTableId
          }
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Row deleted successfully" });
      refetchTableData();
    },
    onError: (error) => {
      toast({
        title: "Error deleting row",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSync = async () => {
    if (!selectedTableId) {
      toast({
        title: "Error",
        description: "Please select a table first",
        variant: "destructive",
      });
      return;
    }

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
      refetchTableData();
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

  const handleCellEdited = async (cell: any, newValue: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('glide-apps-sync', {
        body: { 
          operation: { 
            type: 'update',
            rowId: tableData[cell[1]].id,
            data: { [Object.keys(tableData[cell[1]])[cell[0]]]: newValue.data }
          },
          tableConfig: {
            table: selectedTableId
          }
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Data updated successfully",
      });
      refetchTableData();
    } catch (error) {
      console.error('Error updating data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update data",
        variant: "destructive",
      });
    }
  };

  const handleAddRow = () => {
    if (!tableData || !tableData.length) {
      toast({
        title: "Error",
        description: "Cannot add row: no table template available",
        variant: "destructive",
      });
      return;
    }

    const template = Object.fromEntries(
      Object.keys(tableData[0]).map(key => [key, ''])
    );
    addRowMutation.mutate(template);
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
          {selectedTableId && (
            <Button 
              onClick={handleAddRow}
              disabled={addRowMutation.isPending}
              className="min-w-[140px]"
            >
              {addRowMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </>
              )}
            </Button>
          )}
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
            onValueChange={(value) => {
              setSelectedAppId(value);
              setSelectedTableId("");
            }}
          >
            <SelectTrigger className="w-full">
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
            <SelectTrigger className="w-full">
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

      {(isLoadingApps || isLoadingTables || isLoadingTableData) && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {selectedTableId && tableData && (
        <Card className="p-6">
          <GlideDataTable
            data={tableData}
            columns={Object.keys(tableData[0] || {})}
            onCellEdited={handleCellEdited}
          />
        </Card>
      )}
    </div>
  );
};

export default GlideApps;