import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { useHeaderMapping } from './google-sheets/header-mapping/hooks/useHeaderMapping';
import { HeaderMappingContent } from './google-sheets/header-mapping/HeaderMappingContent';
import { HeaderMappingActions } from './google-sheets/header-mapping/HeaderMappingActions';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HeaderMappingProps {
  spreadsheetId: string;
  sheetGid?: string;
  onMappingComplete: (mapping: Record<string, string>) => void;
}

const DEFAULT_DB_COLUMNS = [
  'id',
  'user_id',
  'chat_id',
  'file_name',
  'file_url',
  'media_type',
  'caption',
  'metadata',
  'created_at',
  'updated_at',
  'media_group_id',
  'additional_data',
  'google_drive_id',
  'google_drive_url',
  'chat.title',
  'chat.username'
];

export const GoogleSheetsHeaderMapping = ({ 
  spreadsheetId, 
  sheetGid,
  onMappingComplete 
}: HeaderMappingProps) => {
  const {
    sheetHeaders,
    mapping,
    isLoading,
    error,
    handleMappingChange,
    handleSelectAll,
    handleSaveMapping,
    isAllColumnsMapped,
  } = useHeaderMapping({
    spreadsheetId,
    sheetGid,
    onMappingComplete,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load sheet headers: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!sheetHeaders || sheetHeaders.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No headers found in the sheet. Please ensure the sheet has headers in the first row.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Header Mapping {sheetGid ? `(Sheet GID: ${sheetGid})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <HeaderMappingContent
          sheetHeaders={sheetHeaders}
          mapping={mapping}
          dbColumns={DEFAULT_DB_COLUMNS}
          onMappingChange={handleMappingChange}
        />
        <div className="mt-4">
          <HeaderMappingActions
            onSave={handleSaveMapping}
            onSelectAll={() => handleSelectAll(DEFAULT_DB_COLUMNS)}
            isSelectAllDisabled={isAllColumnsMapped(DEFAULT_DB_COLUMNS)}
          />
        </div>
      </CardContent>
    </Card>
  );
};