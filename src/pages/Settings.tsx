import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";

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
        <CardContent className="space-y-4">
          <Link 
            to="/media" 
            className="block w-full p-4 rounded-lg bg-black/40 border border-white/10 hover:bg-white/5 transition-colors"
          >
            Media Gallery
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;