export const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function boundedText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength && !/[\p{Cc}\p{Cf}]/u.test(text) ? text : null;
}

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0,10) === value;
}

export async function readBody(request: Request): Promise<Record<string,unknown> | null> {
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json' || !request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let json = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return null;
      }
      json += decoder.decode(value, {stream:true});
    }
    const body: unknown = JSON.parse(json + decoder.decode());
    return body !== null && typeof body === 'object' && !Array.isArray(body) ? body as Record<string,unknown> : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
