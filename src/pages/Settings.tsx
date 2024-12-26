import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-purple-400" />
          <div>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your application settings</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">Settings page is under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;