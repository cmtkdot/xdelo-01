import { MediaItem } from "../types";
import { Separator } from "@/components/ui/separator";

interface MediaViewerMetadataProps {
  item: MediaItem;
}

export const MediaViewerMetadata = ({ item }: MediaViewerMetadataProps) => {
  if (!item.metadata && !item.additional_data) return null;

  return (
    <>
      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <>
          <Separator className="bg-gray-200/50 dark:bg-white/10" />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">Metadata</h4>
            <pre className="text-xs bg-gray-50 dark:bg-black/40 p-2 rounded overflow-x-auto">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          </div>
        </>
      )}

      {item.additional_data && Object.keys(item.additional_data).length > 0 && (
        <>
          <Separator className="bg-gray-200/50 dark:bg-white/10" />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-white/80">Additional Data</h4>
            <pre className="text-xs bg-gray-50 dark:bg-black/40 p-2 rounded overflow-x-auto">
              {JSON.stringify(item.additional_data, null, 2)}
            </pre>
          </div>
        </>
      )}
    </>
  );
};