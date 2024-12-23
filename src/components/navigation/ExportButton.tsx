import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExportButtonProps {
  className?: string;
}

const ExportButton = ({ className }: ExportButtonProps) => {
  const { toast } = useToast();

  const exportToCSV = async () => {
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
        'Caption': item.caption || 'No caption',
        'File URL': item.file_url,
        'Google Drive URL': item.google_drive_url || 'Not uploaded',
        'Google Drive ID': item.google_drive_id || 'N/A'
      }));

      const headers = Object.keys(formattedData[0]);
      const csvContent = [
        headers.join(','),
        ...formattedData.map(row => 
          headers.map(header => {
            const value = row[header]?.toString() || '';
            // Escape quotes and wrap in quotes if contains comma or newline
            return value.includes(',') || value.includes('\n') || value.includes('"') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `media_data_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "Your media data has been exported to CSV format. You can now import this file into Google Sheets.",
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
      onClick={exportToCSV}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
};

export default ExportButton;