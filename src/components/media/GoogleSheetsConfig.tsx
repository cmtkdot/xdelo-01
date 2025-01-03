import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSheetsConfigContent } from "./google-sheets/GoogleSheetsConfigContent";
import { GoogleSheetsConfigProps } from "./google-sheets/types";

export const GoogleSheetsConfig = (props: GoogleSheetsConfigProps) => {
  const { data: clientId } = useQuery({
    queryKey: ['google-client-id'],
    queryFn: async () => {
      const { data: { api_key }, error } = await supabase.functions.invoke('get-google-api-key');
      if (error) throw error;
      return api_key;
    },
  });

  return <GoogleSheetsConfigContent {...props} />;
};