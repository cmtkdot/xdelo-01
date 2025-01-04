-- Drop deprecated functions
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.get_media_data();
DROP FUNCTION IF EXISTS public.cleanup_old_activities();
DROP FUNCTION IF EXISTS public.update_messages_updated_at();

-- Update triggers to use the new update_updated_at_column function
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Drop the cleanup trigger since we're removing the function
DROP TRIGGER IF EXISTS cleanup_old_activities_trigger ON public.bot_activities;