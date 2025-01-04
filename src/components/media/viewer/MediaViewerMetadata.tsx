import { MediaItem } from "../types";

interface MediaViewerMetadataProps {
  item: MediaItem;
}

export const MediaViewerMetadata = ({ item }: MediaViewerMetadataProps) => {
  if (!item.metadata && !item.additional_data) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
        Metadata
      </h4>
      {item.metadata && (
        <pre className="text-xs text-gray-700 dark:text-white/90 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
          {JSON.stringify(item.metadata, null, 2)}
        </pre>
      )}
      {item.additional_data && (
        <>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Additional Data
          </h4>
          <pre className="text-xs text-gray-700 dark:text-white/90 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
            {JSON.stringify(item.additional_data, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
};