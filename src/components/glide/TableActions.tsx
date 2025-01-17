import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import type { GlideTableConfig } from './types';

interface TableActionsProps {
  onAddRow: () => void;
  isAddingRow: boolean;
  selectedTableConfig: GlideTableConfig | null;
}

export function TableActions({ 
  onAddRow, 
  isAddingRow, 
  selectedTableConfig 
}: TableActionsProps) {
  return (
    <div className="flex gap-2">
      <Button 
        onClick={onAddRow}
        disabled={isAddingRow || !selectedTableConfig}
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
    </div>
  );
}