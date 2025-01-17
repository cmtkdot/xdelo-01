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
      config: Config;
      edge_function_logs: EdgeFunctionLogs;
      expense: Expense;
      glide_apps: GlideApps;
      glide_products: GlideProducts;
      glide_table_configs: GlideTableConfigs;
      media: Media;
      messages: Messages;
      sync_logs: SyncLogs;
      sync_sessions: SyncSessions;
      webhook_configurations: WebhookConfigurations;
      webhook_history: WebhookHistory;
      webhook_urls: WebhookUrls;
    };
    Functions: DatabaseFunctions;
    Enums: DatabaseEnums;
  };
}

export interface DatabaseEnums {
  expense_category: 'company_supplies' | 'rent_utility' | 'payroll' | 'manufacture' | 'tp_expenses' | 'grow_expenses' | 'miscellaneous' | 'transportation' | 'dc_expenses' | 'automatic';
  sync_direction: 'glide_to_supabase' | 'supabase_to_glide' | 'bidirectional';
}

import { BotActivities } from './tables/botActivities';
import { BotUsers } from './tables/botUsers';
import { Channels } from './tables/channels';
import { Config } from './tables/config';
import { EdgeFunctionLogs } from './tables/edgeFunctionLogs';
import { Expense } from './tables/expense';
import { GlideApps } from './tables/glideApps';
import { GlideProducts } from './tables/glideProducts';
import { GlideTableConfigs } from './tables/glideTableConfigs';
import { Media } from './tables/media';
import { Messages } from './tables/messages';
import { WebhookConfigurations } from './tables/webhookConfigurations';
import { WebhookHistory } from './tables/webhookHistory';
import { WebhookUrls } from './tables/webhookUrls';
import { SyncLogs } from './tables/syncLogs';
import { SyncSessions } from './tables/syncSessions';
import { DatabaseFunctions } from './functions';

export type {
  BotActivities,
  BotUsers,
  Channels,
  Config,
  EdgeFunctionLogs,
  Expense,
  GlideApps,
  GlideProducts,
  GlideTableConfigs,
  Media,
  Messages,
  WebhookConfigurations,
  WebhookHistory,
  WebhookUrls,
  SyncLogs,
  SyncSessions,
};