import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import type { GlideTableConfig } from '@/components/glide/types';

export function useGlideData(tableConfig: GlideTableConfig | null) {
  const queryClient = useQueryClient();

  const { data: tableData, isLoading } = useQuery({
    queryKey: ['glide-table-data', tableConfig?.id],
    queryFn: async () => {
      if (!tableConfig) return null;
      
      const { data, error } = await supabase
        .from('glide_products')
        .select('*')
        .eq('table_config_id', tableConfig.id);

      if (error) throw error;
      return data;
    },
    enabled: !!tableConfig,
  });

  const addRow = useMutation({
    mutationFn: async (newData: Record<string, any>) => {
      if (!tableConfig) throw new Error('No table selected');
      
      const { data, error } = await supabase
        .from('glide_products')
        .insert([{ ...newData, table_config_id: tableConfig.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glide-table-data', tableConfig?.id] });
      toast({ title: 'Success', description: 'Row added successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      if (!tableConfig) throw new Error('No table selected');
      
      const { data: updatedData, error } = await supabase
        .from('glide_products')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glide-table-data', tableConfig?.id] });
      toast({ title: 'Success', description: 'Row updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      if (!tableConfig) throw new Error('No table selected');
      
      const { error } = await supabase
        .from('glide_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glide-table-data', tableConfig?.id] });
      toast({ title: 'Success', description: 'Row deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    tableData,
    isLoading,
    addRow: addRow.mutate,
    updateRow: updateRow.mutate,
    deleteRow: deleteRow.mutate,
    isModifying: addRow.isPending || updateRow.isPending || deleteRow.isPending
  };
}