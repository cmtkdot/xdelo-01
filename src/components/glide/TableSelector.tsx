import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { GlideTableConfig } from './types';

interface TableSelectorProps {
  selectedAppId: string;
  selectedTableConfig: GlideTableConfig | null;
  onTableSelect: (config: GlideTableConfig) => void;
}

export function TableSelector({ 
  selectedAppId, 
  selectedTableConfig, 
  onTableSelect 
}: TableSelectorProps) {
  const { data: tables, isLoading, error } = useQuery({
    queryKey: ['glide-tables', selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return [];
      
      const { data, error } = await supabase
        .from('glide_table_configs')
        .select('*')
        .eq('app_id', selectedAppId)
        .order('table_name');

      if (error) throw error;
      return data as GlideTableConfig[];
    },
    enabled: !!selectedAppId,
  });

  if (error) {
    console.error('Error fetching Glide tables:', error);
    return <div className="text-red-500">Error loading tables</div>;
  }

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select
      value={selectedTableConfig?.id}
      onValueChange={(value) => {
        const config = tables?.find(t => t.id === value);
        if (config) onTableSelect(config);
      }}
      disabled={isLoading || !selectedAppId}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select Table" />
      </SelectTrigger>
      <SelectContent>
        {tables?.map((table) => (
          <SelectItem key={table.id} value={table.id}>
            {table.table_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}