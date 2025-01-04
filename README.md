# Media Management Application

## Overview
This application is a comprehensive media management system that integrates Telegram channels with Supabase storage. It provides robust synchronization capabilities with external services like Google Drive and Google Sheets, along with advanced media handling features.

## Core Features

### 1. Telegram Integration
- **Webhook Integration**: Automatically captures media files shared in Telegram channels
  - Processes images, videos, documents, and animations
  - Maintains original file metadata and message context
  - Creates public URLs for instant access
- **Channel Management**: 
  - Supports multiple Telegram channels simultaneously
  - Individual channel sync controls
  - Real-time media synchronization
- **Caption Synchronization**: 
  - Syncs captions across all media in media groups
  - Maintains caption history
  - Handles multi-language content
  - Updates captions retroactively when edited in Telegram

### 2. Media Storage & Management
- **Supabase Storage**: 
  - Organized storage buckets for different media types
  - Automatic file type detection and categorization
  - Efficient storage optimization
- **Public URLs**: 
  - Instant public URL generation
  - URL validation and health checks
  - Automatic URL updates on file changes
- **Duplicate Detection**: 
  - Content-based duplicate detection
  - File hash comparison
  - Smart duplicate resolution (keeps newest version)
- **Media Types Support**:
  - Images (JPEG, PNG, GIF, WebP)
  - Videos (MP4, MOV, AVI)
  - Documents (PDF, DOC, DOCX)
  - Animations (GIF, WebM)

### 3. Edge Functions

#### sync-media-captions
- **Purpose**: Synchronizes captions from Telegram messages to media records
- **Functionality**:
  - Fetches all media without captions
  - Retrieves original Telegram messages
  - Updates media records with latest captions
  - Handles media groups collectively
  - Maintains caption history in metadata
- **Error Handling**:
  - Retries on API failures
  - Logs sync attempts and results
  - Reports partial successes

#### resync-media
- **Purpose**: Recreates missing media files and updates records
- **Functionality**:
  - Validates existing file URLs
  - Redownloads missing files from Telegram
  - Updates storage locations
  - Regenerates public URLs
  - Maintains original file names
- **Batch Processing**:
  - Handles multiple files simultaneously
  - Prioritizes missing files
  - Validates results after resyncing

#### sync-telegram-channel
- **Purpose**: Full channel synchronization
- **Functionality**:
  - Fetches complete channel history
  - Creates new media records
  - Downloads missing files
  - Updates existing records
  - Maintains message threading
- **Channel Processing**:
  - Handles message pagination
  - Processes media groups
  - Updates channel metadata

#### upload-to-drive
- **Purpose**: Google Drive integration
- **Functionality**:
  - Uploads media files to Google Drive
  - Creates organized folder structure
  - Maintains file relationships
  - Updates drive URLs in database
- **Features**:
  - Batch upload support
  - Progress tracking
  - Folder organization by date/type

### 4. Database Structure

#### Media Table
```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chat_id BIGINT REFERENCES channels(chat_id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  caption TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  media_group_id TEXT,
  additional_data JSONB DEFAULT '{}',
  google_drive_id TEXT,
  google_drive_url TEXT,
  glide_row_id TEXT,
  public_url TEXT
);
```

Key Features:
- Comprehensive media metadata storage
- Integration points with external services
- Automatic timestamp management
- Flexible additional data storage

#### Channels Table
```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chat_id BIGINT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  username TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Features:
- Channel activity tracking
- User association
- Automatic updates

### 5. Error Handling & Logging

#### Edge Function Logs
```sql
CREATE TABLE edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL
);
```

Logging Features:
- Detailed function execution tracking
- Error state capture
- Performance monitoring
- Audit trail maintenance

### 6. Security

#### Row Level Security (RLS)
- **Media Access**:
  - User-specific data isolation
  - Public/private access management
  - Channel-based permissions
- **Channel Management**:
  - Owner-only channel modifications
  - Public channel visibility
  - Activity state control

#### Authentication
- Supabase authentication integration
- Token-based authorization
- Secure API access
- User session management

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Serve edge functions locally
supabase functions serve

# Run database migrations
supabase db push
```

### Edge Function Development
```bash
# Create new function
supabase functions new function-name

# Deploy function
supabase functions deploy function-name

# View logs
supabase functions logs function-name
```

## Troubleshooting

### Common Issues
1. **Media Sync Failures**
   - Check Telegram bot permissions
   - Verify storage bucket accessibility
   - Review edge function logs
   - Validate webhook configurations

2. **Caption Sync Issues**
   - Confirm message accessibility
   - Check rate limiting
   - Verify channel permissions
   - Review media group associations

3. **Storage Problems**
   - Validate bucket permissions
   - Check file accessibility
   - Verify URL generation
   - Monitor storage quotas

### Logging
- Edge function logs in Supabase dashboard
- Application logs in browser console
- Webhook execution logs in database
- Storage operation logs

## Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License
This project is proprietary and confidential.