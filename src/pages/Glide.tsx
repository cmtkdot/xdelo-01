import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
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
    return format(new Date(date), 'PP p');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Glide Sync Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your Glide product synchronization
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-2">Total Products</h3>
          <p className="text-3xl font-bold">{products?.length || 0}</p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-2">Last Sync</h3>
          <p className="text-3xl font-bold">
            {products?.[0]?.last_synced ? formatDate(products[0].last_synced) : 'Never'}
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-2">Sync Status</h3>
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

      {/* Products Table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map((product) => (
                  <TableRow key={product.glide_product_row_id}>
                    <TableCell className="font-medium">{product.product_name || 'N/A'}</TableCell>
                    <TableCell>{product.vendor_uid || 'N/A'}</TableCell>
                    <TableCell>{formatDate(product.po_date)}</TableCell>
                    <TableCell>{formatCurrency(product.cost)}</TableCell>
                    <TableCell>
                      <Badge variant={product.is_sample ? "secondary" : "default"}>
                        {product.is_sample ? 'Sample' : 'Regular'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(product.last_edited_date)}</TableCell>
                  </TableRow>
                ))}
                {(!products || products.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <XCircle className="h-8 w-8 mb-2" />
                        <p>No products found</p>
                        <p className="text-sm">Click "Sync Now" to fetch products from Glide</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Glide;