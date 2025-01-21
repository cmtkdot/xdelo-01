import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { GlideDataGrid } from "@/components/glide/GlideDataGrid";
import type { Database } from "@/integrations/supabase/types";
import { useSessionContext } from "@supabase/auth-helpers-react";

type GlideProduct = Database['public']['Tables']['glide_products']['Row'];

const Glide = () => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const { session, isLoading: isLoadingSession } = useSessionContext();

  // Fetch Glide products
  const { data: products, isLoading: isLoadingProducts, refetch } = useQuery({
    queryKey: ['glide-products', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) throw new Error('No active session');

      const { data, error } = await supabase
        .from('glide_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GlideProduct[];
    },
    enabled: !!session?.user.id,
  });

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const { error } = await supabase.functions.invoke('glide-sync', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      
      await refetch();
      
      toast({
        title: "Success",
        description: "Products synced successfully",
      });
    } catch (error) {
      console.error('Error syncing products:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync products",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCellEdited = async (cell: any, newValue: any) => {
    if (!products) return;
    
    const rowData = products[cell[1]];
    const columnName = Object.keys(rowData)[cell[0]];
    
    try {
      const { error } = await supabase
        .from('glide_products')
        .update({ [columnName]: newValue.data })
        .eq('glide_product_row_id', rowData.glide_product_row_id);

      if (error) throw error;
      
      refetch();
      
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!products) return;
    const product = products[rowIndex];
    
    try {
      const { error } = await supabase
        .from('glide_products')
        .delete()
        .eq('glide_product_row_id', product.glide_product_row_id);

      if (error) throw error;
      
      refetch();
      
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  // Show loading state while checking session
  if (isLoadingSession) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show message if not authenticated
  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please sign in to view Glide products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Glide Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your Glide products synchronization
          </p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
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

      <Card className="overflow-hidden">
        {isLoadingProducts ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : products && products.length > 0 ? (
          <GlideDataGrid
            data={products}
            columns={Object.keys(products[0]).filter(key => key !== 'id')}
            onCellEdited={handleCellEdited}
            onRowDelete={handleDeleteRow}
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No products found
          </div>
        )}
      </Card>
    </div>
  );
};

export default Glide;