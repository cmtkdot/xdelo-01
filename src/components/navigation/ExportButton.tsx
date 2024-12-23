import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExportButtonProps {
  className?: string;
}

const ExportButton = ({ className }: ExportButtonProps) => {
  const { toast } = useToast();

  const exportToGoogleSheets = async () => {
    try {
      const { data: mediaItems, error } = await supabase
        .from('media')
        .select(`
          *,
          chat:channels(title, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = mediaItems.map(item => ({
        'File Name': item.file_name,
        'Type': item.media_type,
        'Channel': item.chat?.title || 'N/A',
        'Created At': new Date(item.created_at).toLocaleString(),
        'Caption': item.caption || 'No caption'
      }));

      const headers = Object.keys(formattedData[0]);
      const csvContent = [
        headers.join(','),
        ...formattedData.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'media_data.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "Your media data has been exported to CSV format",
        variant: "default",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your media data",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={exportToGoogleSheets}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
};

export default ExportButton;