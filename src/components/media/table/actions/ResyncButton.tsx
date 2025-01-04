import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ResyncButtonProps {
  id: string;
  onUpdate?: () => void;
}

export const ResyncButton = ({ id, onUpdate }: ResyncButtonProps) => {
  const [isResyncing, setIsResyncing] = useState(false);
  const { toast } = useToast();

  const handleResync = async () => {
    try {
      setIsResyncing(true);
      console.log('Resyncing media ID:', id);
      
      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'resync-media',
          status: 'info',
          message: `Starting resync for media ID: ${id}`
        });

      const { data, error } = await supabase.functions.invoke('resync-media', {
        body: { mediaIds: [id] }
      });

      if (error) throw error;

      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'resync-media',
          status: data.errors?.length > 0 ? 'error' : 'success',
          message: data.errors?.length > 0 
            ? `Failed to resync media: ${JSON.stringify(data.errors)}`
            : `Successfully resynced media ID: ${id}`
        });

      if (data.errors?.length > 0) {
        console.warn('Failed to resync media:', data.errors);
        toast({
          title: "Error",
          description: "Failed to resync media",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Media resynced successfully",
        });
      }

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error resyncing media:', error);
      
      await supabase
        .from('edge_function_logs')
        .insert({
          function_name: 'resync-media',
          status: 'error',
          message: `Error resyncing media: ${error.message}`
        });

      toast({
        title: "Error",
        description: "Failed to resync media",
        variant: "destructive",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <button
      onClick={handleResync}
      disabled={isResyncing}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:text-purple-300 transition-all duration-200 font-medium disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${isResyncing ? 'animate-spin' : ''}`} />
    </button>
  );
};