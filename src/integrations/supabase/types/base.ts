export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_training_data: AITrainingData;
      bot_activities: BotActivities;
      bot_users: BotUsers;
      channels: Channels;
      expense: Expense;
      glide_products: GlideProducts;
      google_sheets_config: GoogleSheetsConfig;
      media: Media;
      messages: Messages;
      webhook_configurations: WebhookConfigurations;
      webhook_history: WebhookHistory;
      webhook_urls: WebhookUrls;
    };
    Views: {};
    Functions: DatabaseFunctions;
    Enums: {};
    CompositeTypes: {};
  };
};

// Import all table types
import { AITrainingData } from './tables/aiTrainingData';
import { BotActivities } from './tables/botActivities';
import { BotUsers } from './tables/botUsers';
import { Channels } from './tables/channels';
import { Expense } from './tables/expense';
import { GlideProducts } from './tables/glideProducts';
import { GoogleSheetsConfig } from './tables/googleSheetsConfig';
import { Media } from './tables/media';
import { Messages } from './tables/messages';
import { WebhookConfigurations } from './tables/webhookConfigurations';
import { WebhookHistory } from './tables/webhookHistory';
import { WebhookUrls } from './tables/webhookUrls';
import { DatabaseFunctions } from './functions';

// Re-export all types
export type {
  AITrainingData,
  BotActivities,
  BotUsers,
  Channels,
  Expense,
  GlideProducts,
  GoogleSheetsConfig,
  Media,
  Messages,
  WebhookConfigurations,
  WebhookHistory,
  WebhookUrls,
};