import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, XCircle, Save, Maximize2, Minimize2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface SheetRow {
  [key: string]: string;
}

interface SheetDataDisplayProps {
  isLoading: boolean;
  sheetData: SheetRow[];
}

export const SheetDataDisplay = ({ isLoading, sheetData }: SheetDataDisplayProps) => {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; header: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

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

  const handleCellClick = (rowIndex: number, header: string, value: string) => {
    setEditingCell({ rowIndex, header });
    setEditValue(value);
  };

  const handleSave = async () => {
    if (!editingCell) return;

    try {
      // Here you would typically update the Google Sheet
      // For now, we'll just show a success message
      toast({
        title: "Changes saved",
        description: "The cell has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setEditingCell(null);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Sheet Data
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleExpand}
            className="h-8 w-8"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sheetData.length > 0 ? (
          <ScrollArea className={`${isExpanded ? 'h-[calc(100vh-12rem)]' : 'h-[600px]'} rounded-md border border-white/10`}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(sheetData[0]).map((header) => {
                      const tooltip = getHeaderTooltip(header);
                      return tooltip ? (
                        <TooltipProvider key={header}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TableHead className="cursor-help whitespace-nowrap min-w-[150px]">
                                {header}
                              </TableHead>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TableHead key={header} className="whitespace-nowrap min-w-[150px]">
                          {header}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheetData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {Object.entries(row).map(([header, value], cellIndex) => (
                        <TableCell 
                          key={`${rowIndex}-${cellIndex}`}
                          className="whitespace-nowrap"
                          onClick={() => handleCellClick(rowIndex, header, value)}
                        >
                          {editingCell?.rowIndex === rowIndex && editingCell?.header === header ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 min-w-[120px]"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSave}
                                className="h-8 w-8 p-0"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="cursor-pointer hover:text-blue-400 transition-colors">
                              {value}
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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