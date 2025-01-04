# Media Management Application

## Overview
This application is a comprehensive media management system that integrates Telegram channels with Supabase storage and provides various synchronization capabilities with external services like Google Drive and Google Sheets.

## Core Features

### 1. Telegram Integration
- **Webhook Integration**: Automatically captures media files shared in Telegram channels
- **Channel Management**: Supports multiple Telegram channels with automatic media syncing
- **Caption Synchronization**: Maintains synchronized captions between Telegram and stored media

### 2. Media Storage & Management
- **Supabase Storage**: All media files are stored in Supabase storage buckets
- **Public URLs**: Automatic generation of public URLs for stored media
- **Duplicate Detection**: Built-in functionality to detect and manage duplicate media files
- **Media Types Support**: Handles various media types including:
  - Images
  - Videos
  - Documents
  - Animations

### 3. External Integrations

#### Google Drive Integration
- Upload media files to Google Drive
- Maintain links between Supabase media and Google Drive files
- Automatic file organization in Drive

#### Google Sheets Integration
- Sync media data with Google Sheets
- Configurable header mapping
- Automated synchronization at regular intervals

#### Glide Integration
- Sync product data from Glide
- Link media files with Glide products
- Maintain bidirectional updates

## Technical Architecture

### Database Structure
The application uses Supabase as its backend with the following key tables:

1. **Media Table**: Core table storing all media information
   - File metadata
   - Storage locations
   - Relationships with other services
   - Public URLs
   - Captions and additional data

2. **Channels Table**: Manages Telegram channel information
   - Channel details
   - Sync status
   - User associations

3. **Webhook Configurations**: Manages external webhook integrations
   - Endpoint configurations
   - Headers and authentication
   - Sync schedules

### Edge Functions

1. **resync-media**
   - Recreates missing media files
   - Handles file redownloading from Telegram
   - Updates storage and database records

2. **sync-media-captions**
   - Synchronizes captions from Telegram
   - Updates media records
   - Handles batch processing

3. **upload-to-drive**
   - Manages Google Drive uploads
   - Handles authentication
   - Maintains file metadata

4. **telegram-media-webhook**
   - Processes incoming Telegram updates
   - Handles file downloads
   - Updates database records

### Data Flow

1. **Media Ingestion**
   ```
   Telegram Channel -> Webhook -> Supabase Storage -> Media Table
   ```

2. **Synchronization Flow**
   ```
   Media Table <-> Google Drive
   Media Table <-> Google Sheets
   Media Table <-> Glide
   ```

3. **Public Access**
   ```
   Public URL -> Supabase Storage -> Media File
   ```

## Security

### Row Level Security (RLS)
- Media access controlled through RLS policies
- User-specific data isolation
- Public/private access management

### Authentication
- Supabase authentication integration
- Secure API access
- Token-based authorization

## Environment Setup

### Required Environment Variables
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GLIDE_API_TOKEN=your_glide_token
GLIDE_APP_ID=your_app_id
```

## Development Workflow

1. **Local Development**
   ```sh
   npm install
   npm run dev
   ```

2. **Edge Function Development**
   ```sh
   supabase functions serve
   ```

3. **Database Migrations**
   ```sh
   supabase db push
   ```

## Troubleshooting

### Common Issues
1. **Media Sync Failures**
   - Check Telegram bot permissions
   - Verify storage bucket accessibility
   - Review edge function logs

2. **Integration Issues**
   - Verify API keys and tokens
   - Check webhook configurations
   - Review authentication settings

### Logging
- Edge function logs available in Supabase dashboard
- Application logs in browser console
- Webhook execution logs in database

## Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License
This project is proprietary and confidential.