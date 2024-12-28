import { Skeleton } from "@/components/ui/skeleton";

const MediaGallerySkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border border-gray-200/50 dark:border-white/10 p-4 rounded-lg shadow-sm">
        <Skeleton className="h-8 w-48 bg-gray-200/50 dark:bg-white/5" />
      </div>

      <div className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border border-gray-200/50 dark:border-white/10 p-6 rounded-lg shadow-sm">
        <Skeleton className="h-24 w-full bg-gray-200/50 dark:bg-white/5" />
      </div>

      <div className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border border-gray-200/50 dark:border-white/10 p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 w-full sm:w-[200px] bg-gray-200/50 dark:bg-white/5" />
          <Skeleton className="h-10 w-full sm:w-[200px] bg-gray-200/50 dark:bg-white/5" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border border-gray-200/50 dark:border-white/10 rounded-lg shadow-sm overflow-hidden"
          >
            <Skeleton className="w-full aspect-video bg-gray-200/50 dark:bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaGallerySkeleton;