import { MediaDataTable } from "@/components/media/MediaDataTable";

const MediaData = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Media Data</h1>
      </div>
      <div className="bg-black/20 backdrop-blur-lg rounded-lg p-6 border border-white/10">
        <MediaDataTable />
      </div>
    </div>
  );
};

export default MediaData;