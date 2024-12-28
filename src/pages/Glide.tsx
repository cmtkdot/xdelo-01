import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type GlideProduct = Database['public']['Tables']['glide_products']['Row'];

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
      return data as GlideProduct[];
    },
  });

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('glide-sync', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
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

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'PP');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6 p-6">
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Date</TableHead>
                <TableHead>Vendor UID</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Vendor Product Name</TableHead>
                <TableHead>PO UID</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Media ID</TableHead>
                <TableHead>Video Link</TableHead>
                <TableHead>Caption</TableHead>
                <TableHead>Google URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.glide_product_row_id}>
                  <TableCell>{formatDate(product.po_date)}</TableCell>
                  <TableCell>{product.vendor_uid || 'N/A'}</TableCell>
                  <TableCell>{product.product_name || 'N/A'}</TableCell>
                  <TableCell>{product.vendor_product_name || 'N/A'}</TableCell>
                  <TableCell>{product.po_uid || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(product.cost)}</TableCell>
                  <TableCell>{product.supabase_media_id || 'N/A'}</TableCell>
                  <TableCell>
                    {product.supabase_video_link ? (
                      <a 
                        href={product.supabase_video_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View Video
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>{product.supabase_caption || 'N/A'}</TableCell>
                  <TableCell>
                    {product.supabase_google_url ? (
                      <a 
                        href={product.supabase_google_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View in Drive
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Glide;