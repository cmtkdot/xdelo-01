import { supabase } from "@/integrations/supabase/client";
import Stats from "@/components/Stats";
import MediaGallery from "@/components/MediaGallery";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl -bottom-32 -right-32 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className="grid gap-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Stats />
          </div>

          <div className="glass-card p-4 md:p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-xl">
            <MediaGallery />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;