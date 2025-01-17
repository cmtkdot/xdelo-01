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
  const { spreadsheets, handleAddSpreadsheet, toggleAutoSync, removeSpreadsheet } = useGoogleSheetsConfig();
  const { data: allMedia } = useMediaData();

  useEffect(() => {
    if (googleSheetId) {
      handleAddSpreadsheet("Synced Media Sheet", googleSheetId);
    }
  }, [googleSheetId]);

  return (
    <div className="space-y-4">
      <AddSpreadsheetForm onSubmit={handleAddSpreadsheet} />
      
      {spreadsheets.map(sheet => (
        <SpreadsheetCard
          key={sheet.id}
          sheet={sheet}
          onToggleAutoSync={toggleAutoSync}
          onRemove={removeSpreadsheet}
          onHeaderMappingComplete={(mapping) => {
            console.log('Header mapping complete:', mapping);
          }}
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