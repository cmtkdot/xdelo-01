import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, CheckCircle } from "lucide-react";
import { GoogleSheetsConfig } from "../media/GoogleSheetsConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SheetConfigurationProps {
  onSpreadsheetIdSet: (id: string) => void;
  googleSheetId: string | null;
  parsedMapping: Record<string, string>;
}

export const SheetConfiguration = ({ 
  onSpreadsheetIdSet, 
  googleSheetId, 
  parsedMapping 
}: SheetConfigurationProps) => {
  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          Google Sheets Integration
        </CardTitle>
        <CardDescription>
          Connect and manage your Google Sheets integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSheetsConfig
          onSpreadsheetIdSet={(id) => {
            localStorage.setItem('googleSheetId', id);
            onSpreadsheetIdSet(id);
          }}
        />

        {googleSheetId && (
          <div className="space-y-4">
            <Alert>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <AlertDescription>
                  Connected to sheet: {googleSheetId}
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${googleSheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Open in Google Sheets
                  </a>
                </AlertDescription>
              </div>
            </Alert>

            {Object.keys(parsedMapping).length > 0 && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="text-sm font-medium text-white mb-2">Field Mappings</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(parsedMapping).map(([sheet, db]) => (
                    <div 
                      key={sheet} 
                      className="flex items-center justify-between p-2 rounded bg-white/5"
                    >
                      <span className="text-sm text-white/80">{sheet}</span>
                      <span className="text-sm text-blue-400">→</span>
                      <span className="text-sm text-white/80">{db}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};