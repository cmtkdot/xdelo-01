import { useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { useGoogleSheetsConfig } from './hooks/useGoogleSheetsConfig';
import { AddSpreadsheetForm } from './AddSpreadsheetForm';
import { SpreadsheetCard } from './SpreadsheetCard';
import { SyncManager } from './SyncManager';
import { useMediaData } from '../hooks/useMediaData';
import { GoogleSheetsConfigProps } from './types';

export const GoogleSheetsConfigContent = ({ 
  onSpreadsheetIdSet,
  selectedMedia,
  googleSheetId,
  sheetsConfig 
}: GoogleSheetsConfigProps) => {
  const { spreadsheets, addSpreadsheet, removeSpreadsheet, updateSpreadsheet } = useGoogleSheetsConfig();
  const { data: allMedia } = useMediaData();

  useEffect(() => {
    if (googleSheetId) {
      addSpreadsheet(googleSheetId);
    }
  }, [googleSheetId]);

  return (
    <div className="space-y-4">
      <AddSpreadsheetForm onSubmit={addSpreadsheet} />
      
      {spreadsheets.map(sheet => (
        <SpreadsheetCard
          key={sheet.id}
          spreadsheet={sheet}
          onRemove={removeSpreadsheet}
          onUpdate={updateSpreadsheet}
        />
      ))}

      {spreadsheets.length > 0 && (
        <SyncManager
          spreadsheets={spreadsheets}
          allMedia={allMedia}
        />
      )}
    </div>
  );
};