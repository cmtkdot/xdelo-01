import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { GlideApp } from './types';

interface AppSelectorProps {
  selectedAppId: string;
  onAppSelect: (appId: string) => void;
}

export function AppSelector({ selectedAppId, onAppSelect }: AppSelectorProps) {
  const [session, setSession] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: apps, isLoading, error } = useQuery({
    queryKey: ['glide-apps', session?.access_token],
    queryFn: async () => {
      if (!session) throw new Error('Not authenticated');

      const { data: response, error: functionError } = await supabase.functions.invoke('glide-apps-sync', {
        body: { operation: 'list-apps' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw functionError;
      }
      
      return response.apps as GlideApp[];
    },
    enabled: !!session,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch Glide apps",
        variant: "destructive",
      });
    }
  }, [error, toast]);

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