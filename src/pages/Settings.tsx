import { GlideDataView } from "@/components/glide/GlideDataView";
import { EdgeFunctionLogs } from "@/components/settings/EdgeFunctionLogs";

export default function Settings() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <div className="space-y-8">
        <GlideDataView />
        <EdgeFunctionLogs />
      </div>
    </div>
  );
}