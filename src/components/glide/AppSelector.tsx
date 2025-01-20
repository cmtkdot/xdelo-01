import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { GlideApp } from './types';

interface AppSelectorProps {
  selectedAppId: string;
  onAppSelect: (appId: string) => void;
}

export function AppSelector({ selectedAppId, onAppSelect }: AppSelectorProps) {
  const { data: apps, isLoading, error } = useQuery({
    queryKey: ['glide-apps'],
    queryFn: async () => {
      const { data: response, error: functionError } = await supabase.functions.invoke('glide-apps-sync', {
        body: { operation: 'list-apps' }
      });

      if (functionError) throw functionError;
      return response.apps as GlideApp[];
    },
  });

  if (error) {
    console.error('Error fetching Glide apps:', error);
    return <div className="text-red-500">Error loading apps</div>;
  }

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <div className="w-full">
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
    </div>
  );
}