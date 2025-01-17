import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GlideApp } from './types';

interface AppSelectorProps {
  selectedAppId: string;
  onAppSelect: (appId: string) => void;
}

export function AppSelector({ selectedAppId, onAppSelect }: AppSelectorProps) {
  const { data: apps, isLoading } = useQuery({
    queryKey: ['glide-apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('glide_apps')
        .select('*')
        .eq('is_active', true)
        .order('app_name');

      if (error) throw error;
      return data as GlideApp[];
    },
  });

  return (
    <Select
      value={selectedAppId}
      onValueChange={onAppSelect}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select Glide App" />
      </SelectTrigger>
      <SelectContent>
        {apps?.map((app) => (
          <SelectItem key={app.id} value={app.id}>
            {app.app_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}