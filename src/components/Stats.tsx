import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, MessageSquare, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Stats = () => {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [messagesCount, mediaCount, channelsCount] = await Promise.all([
        supabase.from('messages').select('id', { count: 'exact' }),
        supabase.from('media').select('id', { count: 'exact' }),
        supabase.from('channels').select('id', { count: 'exact' })
      ]);
      
      return {
        messages: messagesCount.count || 0,
        media: mediaCount.count || 0,
        channels: channelsCount.count || 0
      };
    }
  });

  return (
    <>
      <Card className="bg-black/40 border border-white/10 backdrop-blur-xl hover:shadow-purple-500/10 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Media</CardTitle>
          <Image className="w-4 h-4 text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{stats?.media || '...'}</div>
        </CardContent>
      </Card>
      <Card className="bg-black/40 border border-white/10 backdrop-blur-xl hover:shadow-purple-500/10 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">Messages</CardTitle>
          <MessageSquare className="w-4 h-4 text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{stats?.messages || '...'}</div>
        </CardContent>
      </Card>
      <Card className="bg-black/40 border border-white/10 backdrop-blur-xl hover:shadow-purple-500/10 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">Active Channels</CardTitle>
          <Activity className="w-4 h-4 text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {stats?.channels || '...'}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Stats;