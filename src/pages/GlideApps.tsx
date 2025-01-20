import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { GlideDataGrid } from "@/components/glide/GlideDataGrid";
import { AppSelector } from "@/components/glide/AppSelector";
import { TableSelector } from "@/components/glide/TableSelector";
import { TableActions } from "@/components/glide/TableActions";
import { useGlideData } from "@/hooks/useGlideData";
import { useToast } from "@/components/ui/use-toast";
import type { GlideTableConfig } from "@/components/glide/types";

const GlideApps = () => {
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [selectedTableConfig, setSelectedTableConfig] = useState<GlideTableConfig | null>(null);
  const { toast } = useToast();
  
  const { 
    tableData, 
    isLoading, 
    addRow, 
    updateRow, 
    deleteRow, 
    isModifying,
    syncTable 
  } = useGlideData(selectedTableConfig);

  const handleTableSelect = (config: GlideTableConfig) => {
    setSelectedTableConfig(config);
  };

  const handleSync = async () => {
    if (!selectedTableConfig) return;
    
    try {
      await syncTable();
      toast({
        title: "Success",
        description: "Table synced successfully",
      });
    } catch (error) {
      console.error('Error syncing table:', error);
      toast({
        title: "Error",
        description: "Failed to sync table",
        variant: "destructive",
      });
    }
  };

  const handleCellEdited = (cell: any, newValue: any) => {
    if (!tableData) return;
    
    const rowData = tableData[cell[1]];
    const columnName = Object.keys(rowData)[cell[0]];
    
    updateRow({
      glide_product_row_id: rowData.glide_product_row_id,
      data: { [columnName]: newValue.data }
    });
  };

  const handleAddRow = () => {
    if (!tableData?.length) return;
    
    const template = Object.fromEntries(
      Object.keys(tableData[0])
        .filter(key => key !== 'id')
        .map(key => [key, ''])
    );
    
    addRow(template);
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (!tableData) return;
    const glide_product_row_id = tableData[rowIndex].glide_product_row_id;
    deleteRow(glide_product_row_id);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 mt-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Glide Apps Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your Glide apps synchronization
          </p>
        </div>
        <TableActions 
          onAddRow={handleAddRow}
          onSync={handleSync}
          isAddingRow={isModifying}
          selectedTableConfig={selectedTableConfig}
        />
      </div>

      <div className="flex gap-4">
        <div className="w-1/2">
          <AppSelector 
            selectedAppId={selectedAppId}
            onAppSelect={(value) => {
              setSelectedAppId(value);
              setSelectedTableConfig(null);
            }}
          />
        </div>
        <div className="w-1/2">
          <TableSelector
            selectedAppId={selectedAppId}
            selectedTableConfig={selectedTableConfig}
            onTableSelect={handleTableSelect}
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {selectedTableConfig && tableData && (
        <Card className="p-6">
          <GlideDataGrid
            data={tableData}
            columns={Object.keys(tableData[0] || {}).filter(key => key !== 'id')}
            onCellEdited={handleCellEdited}
            onRowDelete={handleDeleteRow}
          />
        </Card>
      )}
    </div>
  );
};

export default GlideApps;