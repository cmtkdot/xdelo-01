# Database Structure

## Media Table
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
  public_url TEXT,
  webhook_configuration_id UUID
);
```

## Channels Table
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

## Edge Function Logs
```sql
CREATE TABLE edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL
);
```