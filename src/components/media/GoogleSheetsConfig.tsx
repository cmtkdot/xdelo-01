import { supabase } from "@/integrations/supabase/client";
import { GoogleSheetsConfigContent } from "./google-sheets/GoogleSheetsConfigContent";
import { GoogleSheetsConfigProps } from "./google-sheets/types";
import { useQuery } from "@tanstack/react-query";

export const GoogleSheetsConfig = (props: GoogleSheetsConfigProps) => {
  const { data: clientId } = useQuery({
    queryKey: ['google-client-id'],
    queryFn: async () => {
      const { data: { api_key } } = await supabase.functions.invoke('get-google-api-key');
      return api_key;
    },
  });

  return <GoogleSheetsConfigContent {...props} />;
};