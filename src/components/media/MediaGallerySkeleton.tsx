import { Skeleton } from "@/components/ui/skeleton";

const MediaGallerySkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="glass-card p-4">
        <Skeleton className="h-8 w-48 bg-white/5" />
      </div>

      <div className="glass-card p-6">
        <Skeleton className="h-24 w-full bg-white/5" />
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 w-full sm:w-[200px] bg-white/5" />
          <Skeleton className="h-10 w-full sm:w-[200px] bg-white/5" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-card aspect-video animate-pulse">
            <Skeleton className="w-full h-full bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaGallerySkeleton;