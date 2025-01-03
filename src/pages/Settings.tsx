import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import MediaMigrationSection from "@/components/settings/MediaMigrationSection";

const Settings = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <Card className="backdrop-blur-xl bg-white/90 dark:bg-black/40 border-gray-200/50 dark:border-white/10">
        <CardHeader className="flex flex-row items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-purple-500" />
          <div>
            <CardTitle className="text-gray-800 dark:text-white">Settings</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Manage your application settings
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">
              Appearance
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Switch between light and dark themes
                  </div>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-gray-200/50 dark:bg-white/10" />
          
          <MediaMigrationSection />
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;