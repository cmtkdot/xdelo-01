export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ai_training_data: AITrainingDataTable;
      bot_activities: BotActivitiesTable;
      bot_users: BotUsersTable;
      channels: ChannelsTable;
      media: MediaTable;
      messages: MessagesTable;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: DatabaseFunctions;
    Enums: DatabaseEnums;
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export interface DatabaseEnums {}