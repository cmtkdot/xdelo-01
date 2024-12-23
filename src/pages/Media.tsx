import { MediaDataTable } from "@/components/media/MediaDataTable";

const Media = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-white">Media Library</h1>
      </div>
      <div className="bg-black/20 rounded-lg p-6">
        <MediaDataTable />
      </div>
    </div>
  );
};

export default Media;