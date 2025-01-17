import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GlideTableConfig } from './types';

interface TableSelectorProps {
  selectedAppId: string;
  selectedTableId: string;
  onTableSelect: (tableId: string) => void;
}

export function TableSelector({ selectedAppId, selectedTableId, onTableSelect }: TableSelectorProps) {
  const { data: tableConfigs, isLoading } = useQuery({
    queryKey: ['glide-table-configs', selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return [];
      const { data, error } = await supabase
        .from('glide_table_configs')
        .select('*')
        .eq('app_id', selectedAppId)
        .eq('is_active', true)
        .order('table_name');

      if (error) throw error;
      return data as GlideTableConfig[];
    },
    enabled: !!selectedAppId,
  });

  return (
    <Select
      value={selectedTableId}
      onValueChange={onTableSelect}
      disabled={isLoading || !selectedAppId || !tableConfigs?.length}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select Table" />
      </SelectTrigger>
      <SelectContent>
        {tableConfigs?.map((config) => (
          <SelectItem key={config.id} value={config.table_id}>
            {config.table_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}