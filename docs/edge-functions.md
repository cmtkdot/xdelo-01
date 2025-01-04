# Edge Functions

## sync-media-captions
**Purpose**: Synchronizes captions from Telegram messages to media records

**Functionality**:
- Fetches all media without captions or in media groups
- Retrieves original Telegram messages
- Updates media records with latest captions
- Handles media groups collectively:
  - Syncs captions across all media in the same group
  - Maintains consistent metadata across group
  - Updates all related media when any caption is edited
- Maintains caption history in metadata JSON

**Error Handling**:
- Retries on API failures with exponential backoff
- Logs all sync attempts and results
- Reports partial successes with details
- Handles rate limiting gracefully

## resync-media
**Purpose**: Recreates missing media files and updates records

**Functionality**:
- Validates existing file URLs
- Redownloads missing files from Telegram
- Updates storage locations and metadata
- Regenerates public URLs
- Maintains original file names and types
- Handles various media types differently:
  - Images: Preserves EXIF data
  - Videos: Maintains original quality
  - Documents: Keeps original format

**Error Handling**:
- Validates file integrity after download
- Retries failed downloads
- Logs all operations with detailed status

## sync-telegram-channel
**Purpose**: Complete channel synchronization

**Functionality**:
- Fetches complete channel history
- Creates new media records
- Downloads missing files
- Updates existing records
- Maintains message threading
- Processes media groups together
- Updates channel metadata

**Processing Features**:
- Handles message pagination
- Processes media groups as atomic units
- Updates channel metadata
- Maintains message order
- Preserves all original metadata

## upload-to-drive
**Purpose**: Google Drive integration

**Functionality**:
- Uploads media files to Google Drive
- Creates organized folder structure
- Maintains file relationships
- Updates drive URLs in database
- Handles rate limiting
- Manages quota restrictions

**Features**:
- Batch upload support
- Progress tracking
- Folder organization by date/type
- Metadata preservation
- Error recovery