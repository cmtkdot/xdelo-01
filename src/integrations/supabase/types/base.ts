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
      bot_activities: BotActivities;
      bot_users: BotUsers;
      channels: Channels;
      expense: Expense;
      glide_products: GlideProducts;
      media: Media;
      messages: Messages;
      webhook_configurations: WebhookConfigurations;
      webhook_history: WebhookHistory;
      webhook_urls: WebhookUrls;
      sync_logs: SyncLogs;
      sync_sessions: SyncSessions;
    };
  };
}

import { BotActivities } from './tables/botActivities';
import { BotUsers } from './tables/botUsers';
import { Channels } from './tables/channels';
import { Expense } from './tables/expense';
import { GlideProducts } from './tables/glideProducts';
import { Media } from './tables/media';
import { Messages } from './tables/messages';
import { WebhookConfigurations } from './tables/webhookConfigurations';
import { WebhookHistory } from './tables/webhookHistory';
import { WebhookUrls } from './tables/webhookUrls';
import { SyncLogs } from './tables/syncLogs';
import { SyncSessions } from './tables/syncSessions';

export type {
  BotActivities,
  BotUsers,
  Channels,
  Expense,
  GlideProducts,
  Media,
  Messages,
  WebhookConfigurations,
  WebhookHistory,
  WebhookUrls,
  SyncLogs,
  SyncSessions,
};