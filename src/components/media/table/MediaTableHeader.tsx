import { FileSpreadsheet } from "lucide-react";

export const MediaTableHeader = () => {
  return (
    <div className="flex items-center gap-2 backdrop-blur-xl bg-black/40 border border-white/10 p-4 rounded-lg">
      <FileSpreadsheet className="w-6 h-6 text-sky-400" />
      <h1 className="text-xl font-semibold text-white">Media Table View</h1>
    </div>
  );
};