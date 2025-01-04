# Development Workflow

## Local Development
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

## Edge Function Development
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