import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Plus } from 'lucide-react';

interface TableActionsProps {
  onSync: () => void;
  onAddRow: () => void;
  isSyncing: boolean;
  isAddingRow: boolean;
  selectedTableId: string;
}

export function TableActions({ 
  onSync, 
  onAddRow, 
  isSyncing, 
  isAddingRow, 
  selectedTableId 
}: TableActionsProps) {
  return (
    <div className="flex gap-2">
      {selectedTableId && (
        <Button 
          onClick={onAddRow}
          disabled={isAddingRow}
          className="min-w-[140px]"
        >
          {isAddingRow ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </>
          )}
        </Button>
      )}
      <Button 
        onClick={onSync} 
        disabled={isSyncing || !selectedTableId}
        className="min-w-[140px]"
      >
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Now
          </>
        )}
      </Button>
    </div>
  );
}