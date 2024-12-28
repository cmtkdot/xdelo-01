import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen p-6 relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-900/5 to-black">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float delay-1000"></div>
        </div>
      </div>

      {/* Content container */}
      <div className="relative space-y-6 z-10">
        {/* Header section */}
        <div className="backdrop-blur-xl bg-black/40 rounded-2xl border border-white/10 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
              Glide Products
            </h1>
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="relative backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Products"
              )}
            </Button>
          </div>
        </div>

        {/* Table section */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-black/40 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10 hover:bg-white/5">
                    <TableHead className="text-blue-400">PO Date</TableHead>
                    <TableHead className="text-blue-400">Vendor UID</TableHead>
                    <TableHead className="text-blue-400">Product Name</TableHead>
                    <TableHead className="text-blue-400">Vendor Product Name</TableHead>
                    <TableHead className="text-blue-400">PO UID</TableHead>
                    <TableHead className="text-blue-400">Cost</TableHead>
                    <TableHead className="text-blue-400">Media ID</TableHead>
                    <TableHead className="text-blue-400">Video Link</TableHead>
                    <TableHead className="text-blue-400">Caption</TableHead>
                    <TableHead className="text-blue-400">Google URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((product) => (
                    <TableRow 
                      key={product.glide_product_row_id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="text-white/90">{formatDate(product.po_date)}</TableCell>
                      <TableCell className="text-white/90">{product.vendor_uid || 'N/A'}</TableCell>
                      <TableCell className="text-white/90">{product.product_name || 'N/A'}</TableCell>
                      <TableCell className="text-white/90">{product.vendor_product_name || 'N/A'}</TableCell>
                      <TableCell className="text-white/90">{product.po_uid || 'N/A'}</TableCell>
                      <TableCell className="text-white/90">{formatCurrency(product.cost)}</TableCell>
                      <TableCell className="text-white/90">{product.supabase_media_id || 'N/A'}</TableCell>
                      <TableCell>
                        {product.supabase_video_link ? (
                          <a 
                            href={product.supabase_video_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            View Video
                          </a>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-white/90">{product.supabase_caption || 'N/A'}</TableCell>
                      <TableCell>
                        {product.supabase_google_url ? (
                          <a 
                            href={product.supabase_google_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Glide;