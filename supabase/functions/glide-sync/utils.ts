export const parseDate = (dateStr: string | undefined) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

export const parseNumber = (num: any) => {
  if (num === undefined || num === null) return null;
  const parsed = Number(num);
  return isNaN(parsed) ? null : parsed;
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};