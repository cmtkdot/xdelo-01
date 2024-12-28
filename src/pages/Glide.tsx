import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const Glide = () => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['glide-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('glide_products')
        .select('*')
        .order('last_synced', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const { error } = await supabase.functions.invoke('glide-sync');
      
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
        description: "Failed to sync products",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Glide Products</h1>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
        >
          {isSyncing ? "Syncing..." : "Sync Products"}
        </Button>
      </div>

      {isLoading ? (
        <div>Loading products...</div>
      ) : (
        <div className="grid gap-4">
          {products?.map((product) => (
            <div 
              key={product.glide_row_id}
              className="p-4 rounded-lg border bg-card"
            >
              <pre className="text-sm">
                {JSON.stringify(product.product_data, null, 2)}
              </pre>
              <div className="text-sm text-muted-foreground mt-2">
                Last synced: {new Date(product.last_synced).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Glide;