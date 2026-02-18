export function isRateLimitError(status: number, data: any): boolean {
  if (status === 429) return true;
  const msg =
    typeof data?.error?.message === 'string'
      ? data.error.message
      : typeof data?.message === 'string'
      ? data.message
      : '';
  const text = (msg || JSON.stringify(data || {})).toLowerCase();
  if (text.includes('too many request') || text.includes('too many requests')) return true;
  if (text.includes('resource_exhausted') || text.includes('resource exhausted')) return true;
  if (typeof data?.error?.code === 'number' && data.error.code === 429) return true;
  return false;
}
