import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface SyncChannelDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
  status: string;
  isLoading: boolean;
}

const SyncChannelDialog = ({
  isOpen,
  onOpenChange,
  progress,
  status,
  isLoading
}: SyncChannelDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-black/40 backdrop-blur-xl border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Channel Sync Status</DialogTitle>
          <DialogDescription className="text-gray-400">
            Synchronizing media from Telegram channels
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isLoading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Progress</span>
              <span className="text-white">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="text-sm text-gray-400">
            Status: {status}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncChannelDialog;