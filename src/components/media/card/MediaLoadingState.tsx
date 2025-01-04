interface MediaLoadingStateProps {
  isLoading: boolean;
  hasError: boolean;
}

export const MediaLoadingState = ({ isLoading, hasError }: MediaLoadingStateProps) => {
  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="animate-pulse w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load media</p>
      </div>
    );
  }

  return null;
};