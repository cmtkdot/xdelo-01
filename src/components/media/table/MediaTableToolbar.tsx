import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RefreshCw, Trash2 } from "lucide-react"
import { useMediaOperations } from "../hooks/useMediaOperations"

interface MediaTableToolbarProps {
  onDeleteSuccess: () => void;
}

export function MediaTableToolbar({
  onDeleteSuccess
}: MediaTableToolbarProps) {
  const { 
    isDeletingDuplicates,
    isSyncingCaptions,
    handleDeleteDuplicates,
    handleSyncCaptions 
  } = useMediaOperations(onDeleteSuccess);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter media..."
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncCaptions}
          disabled={isSyncingCaptions}
          className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncingCaptions ? 'animate-spin' : ''}`} />
          Sync Captions
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteDuplicates}
          disabled={isDeletingDuplicates}
          className="text-xs bg-white dark:bg-transparent border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Duplicates
        </Button>
      </div>
    </div>
  )
}