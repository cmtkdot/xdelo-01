import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SheetRow {
  [key: string]: string;
}

interface SheetDataDisplayProps {
  isLoading: boolean;
  sheetData: SheetRow[];
}

export const SheetDataDisplay = ({ isLoading, sheetData }: SheetDataDisplayProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const getHeaderTooltip = (header: string) => {
    if (header === 'Row ID') {
      return 'Unique identifier (UUID) for each media record in the database';
    }
    return null;
  };

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-6 w-6" />
          Sheet Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sheetData.length > 0 ? (
          <ScrollArea className="h-[400px] rounded-md border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(sheetData[0]).map((header) => {
                    const tooltip = getHeaderTooltip(header);
                    return tooltip ? (
                      <TooltipProvider key={header}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <TableHead className="cursor-help">{header}</TableHead>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TableHead key={header}>{header}</TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheetData.map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value, cellIndex) => (
                      <TableCell key={cellIndex}>{String(value)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex items-center gap-2 text-white/60 p-4">
            <XCircle className="h-5 w-5" />
            <span>No data available in the sheet</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};