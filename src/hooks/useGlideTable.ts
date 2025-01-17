import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlideTableConfig, GlideTableOperation } from '@/integrations/glide/types';

export function useGlideTable(tableConfig: GlideTableConfig) {
  const executeOperation = async (operation: GlideTableOperation) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await supabase.functions.invoke('glide-apps-sync', {
      body: { 
        tableConfig,
        operation
      },
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      }
    });

    if (response.error) throw response.error;
    return response.data;
  };

  // Query for fetching data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['glide-table', tableConfig.table],
    queryFn: () => executeOperation({ type: 'get' })
  });

  // Mutations for modifying data
  const addMutation = useMutation({
    mutationFn: (data: Record<string, any>) => 
      executeOperation({ type: 'add', data })
  });

  const updateMutation = useMutation({
    mutationFn: ({ rowId, data }: { rowId: string; data: Record<string, any> }) => 
      executeOperation({ type: 'update', rowId, data })
  });

  const deleteMutation = useMutation({
    mutationFn: (rowId: string) => 
      executeOperation({ type: 'delete', rowId })
  });

  return {
    data,
    isLoading,
    error,
    refetch,
    add: addMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isModifying: addMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  };
}