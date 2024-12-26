import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHEET_NAME } from "./utils/googleSheets/formatters";

interface HeaderMapping {
  sheetHeader: string;
  linkedField: string | null;
}

interface GoogleSheetsHeaderMappingProps {
  spreadsheetId: string;
  onMappingComplete: (mapping: Record<string, string>) => void;
}

const AVAILABLE_FIELDS = [
  { value: "file_name", label: "File Name" },
  { value: "media_type", label: "Type" },
  { value: "chat.title", label: "Channel" },
  { value: "created_at", label: "Created At" },
  { value: "caption", label: "Caption" },
  { value: "file_url", label: "Original File URL" },
  { value: "google_drive_url", label: "Google Drive URL" },
  { value: "google_drive_id", label: "Google Drive ID" },
  { value: "updated_at", label: "Last Updated" },
  { value: "media_group_id", label: "Media Group ID" },
  { value: "id", label: "Row ID" },
];

export const GoogleSheetsHeaderMapping = ({ spreadsheetId, onMappingComplete }: GoogleSheetsHeaderMappingProps) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<HeaderMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchHeaders = async () => {
      if (!spreadsheetId || !window.gapi?.client?.sheets) {
        console.log('Sheets API not ready or spreadsheet ID not provided');
        return;
      }

      setIsLoading(true);
      try {
        console.log(`Fetching headers from sheet: ${SHEET_NAME}`);
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${SHEET_NAME}!1:1`,
        });
        
        const headerRow = response.result.values?.[0] || [];
        console.log('Fetched headers:', headerRow);
        setHeaders(headerRow);
        setMappings(headerRow.map(header => ({
          sheetHeader: header,
          linkedField: null
        })));
      } catch (error) {
        console.error('Error fetching headers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch spreadsheet headers. Please make sure the sheet exists and you have access.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (spreadsheetId) {
      fetchHeaders();
    }
  }, [spreadsheetId, toast]);

  const handleFieldLink = (headerIndex: number, fieldValue: string | null) => {
    setMappings(prev => {
      const updated = [...prev];
      updated[headerIndex] = {
        ...updated[headerIndex],
        linkedField: fieldValue
      };
      return updated;
    });
  };

  const handleSaveMapping = () => {
    const mapping: Record<string, string> = {};
    mappings.forEach(({ sheetHeader, linkedField }) => {
      if (linkedField) {
        mapping[sheetHeader] = linkedField;
      }
    });
    onMappingComplete(mapping);
    
    toast({
      title: "Success",
      description: "Header mapping saved successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Link Spreadsheet Headers</h3>
        <Button onClick={handleSaveMapping} className="gap-2">
          <LinkIcon className="h-4 w-4" />
          Save Mapping
        </Button>
      </div>

      {headers.length > 0 ? (
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spreadsheet Header</TableHead>
                <TableHead>Link To Field</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping, index) => (
                <TableRow key={mapping.sheetHeader}>
                  <TableCell className="font-medium">{mapping.sheetHeader}</TableCell>
                  <TableCell>
                    <Select
                      value={mapping.linkedField || ""}
                      onValueChange={(value) => handleFieldLink(index, value)}
                    >
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Select a field to link" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {AVAILABLE_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mapping.linkedField ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-500">Linked</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Not linked</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      ) : (
        <div className="text-center p-8 text-gray-500">
          No headers found in the spreadsheet. Please make sure the sheet is properly initialized.
        </div>
      )}
    </div>
  );
};