import { supabase } from "@/integrations/supabase/client";
import Stats from "@/components/Stats";
import MediaGallery from "@/components/media/MediaGallery";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-purple-500/20 blur-3xl -top-24 sm:-top-48 -left-24 sm:-left-48 animate-pulse"></div>
        <div className="absolute w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] rounded-full bg-blue-500/20 blur-3xl -bottom-16 sm:-bottom-32 -right-16 sm:-right-32 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        <div className="grid gap-4 sm:gap-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Stats />
          </div>

          <div className="glass-card p-3 sm:p-6">
            <MediaGallery />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;