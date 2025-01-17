import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { GlideDataTable } from "@/components/glide/GlideDataTable";
import { AppSelector } from "@/components/glide/AppSelector";
import { TableSelector } from "@/components/glide/TableSelector";
import { TableActions } from "@/components/glide/TableActions";
import type { GlideTableData } from "@/components/glide/types";

const GlideApps = () => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");

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
        <TableActions 
          onSync={handleSync}
          onAddRow={handleAddRow}
          isSyncing={isSyncing}
          isAddingRow={addRowMutation.isPending}
          selectedTableId={selectedTableId}
        />
      </div>

      <div className="flex gap-4">
        <div className="w-1/2">
          <AppSelector 
            selectedAppId={selectedAppId}
            onAppSelect={(value) => {
              setSelectedAppId(value);
              setSelectedTableId("");
            }}
          />
        </div>
        <div className="w-1/2">
          <TableSelector
            selectedAppId={selectedAppId}
            selectedTableId={selectedTableId}
            onTableSelect={setSelectedTableId}
          />
        </div>
      </div>

      {isLoadingTableData && (
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