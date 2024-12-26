import { useState } from "react";
import { Card } from "@/components/ui/card";
import { SheetConfiguration } from "@/components/google-sheets/SheetConfiguration";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function GoogleSheet() {
  const [googleSheetId, setGoogleSheetId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: headerMapping = {} } = useQuery({
    queryKey: ['sheet-headers', googleSheetId],
    queryFn: async () => {
      if (!googleSheetId) return {};

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('google_sheets_config')
        .select('header_mapping')
        .eq('spreadsheet_id', googleSheetId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching headers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch header mappings. Please try again.",
          variant: "destructive",
        });
        return {};
      }

      return data?.header_mapping || {};
    },
    enabled: !!googleSheetId,
  });

  const handleSpreadsheetIdSet = (id: string) => {
    setGoogleSheetId(id);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card className="bg-black/40 backdrop-blur-xl border-white/10">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Google Sheets Integration</h1>
          <p className="text-gray-400 mb-6">
            Configure and manage your Google Sheets integration settings
          </p>
          
          <SheetConfiguration
            onSpreadsheetIdSet={handleSpreadsheetIdSet}
            googleSheetId={googleSheetId}
            parsedMapping={headerMapping}
          />
        </div>
      </Card>
    </div>
  );
}