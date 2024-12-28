import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const useMediaSubscription = (refetch: () => void) => {
  useEffect(() => {
    const channel = supabase
      .channel('media_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media'
        },
        () => {
          console.log('Media table changed, refetching...');
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);
};

export default useMediaSubscription;