import { corsHeaders } from './cors.ts';

export { corsHeaders };

export const parseDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toISOString();
  } catch {
    return null;
  }
};

export const parseNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  
  // Convert string to number if needed
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check if it's a valid number
  return isNaN(num) ? null : num;
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};