const SENSITIVE_KEY_RE =
  /password|passwd|pwd|token|secret|authorization|api[_-]?key|cookie|credential|session|phone|mobile|idcard|identity/i;

const MAX_DEPTH = 6;

export function truncate(value: string, max = 2048): string {
  if (typeof value !== 'string') return value;
  return value.length > max ? value.slice(0, max) + '...' : value;
}

export function redactDeep(input: any, key = '', depth = 0): any {
  if (input === null || input === undefined || depth > MAX_DEPTH) return input;
  if (SENSITIVE_KEY_RE.test(key)) return '[REDACTED]';
  if (Array.isArray(input)) {
    return input.map((item) => redactDeep(item, '', depth + 1));
  }
  if (typeof input === 'object') {
    const result: Record<string, any> = {};
    Object.keys(input).forEach((k) => {
      result[k] = redactDeep(input[k], k, depth + 1);
    });
    return result;
  }
  if (typeof input === 'string') {
    return truncate(input, key === 'message' ? 2048 : 4096);
  }
  return input;
}

export function sanitizeUrl(url: string, max = 2048): string {
  if (!url) return '';
  if (typeof url !== 'string') return String(url);
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((_value, key) => {
      if (SENSITIVE_KEY_RE.test(key)) parsed.searchParams.set(key, '[REDACTED]');
    });
    return truncate(parsed.toString(), max);
  } catch (_e) {
    return truncate(url, max);
  }
}

export function sanitizeStack(frames: any[]): any[] {
  if (!Array.isArray(frames)) return [];
  return frames.slice(0, 40).map((frame) => ({
    url: sanitizeUrl(frame?.url || '', 512),
    func: truncate(String(frame?.func || ''), 256),
    line: Number.isFinite(Number(frame?.line)) ? Number(frame.line) : null,
    column: Number.isFinite(Number(frame?.column)) ? Number(frame.column) : null,
    mappedFrom: frame?.mappedFrom ? truncate(String(frame.mappedFrom), 512) : null,
  }));
}

export function sanitizeBreadcrumbs(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return list.slice(-50).map((item) => ({
    type: String(item?.type || ''),
    category: String(item?.category || ''),
    level: String(item?.level || ''),
    time: Number(item?.time) || 0,
    data: redactDeep(item?.data, 'data', 0),
  }));
}

export function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return {};
  const cleaned = redactDeep(data, '', 0);
  if (typeof cleaned.url === 'string') cleaned.url = sanitizeUrl(cleaned.url);
  if (typeof cleaned.message === 'string') cleaned.message = truncate(cleaned.message, 2048);
  if (typeof cleaned.name === 'string') cleaned.name = truncate(cleaned.name, 255);
  if (typeof cleaned.release === 'string') cleaned.release = truncate(cleaned.release, 128);
  if (Array.isArray(cleaned.stack)) cleaned.stack = sanitizeStack(cleaned.stack);
  return cleaned;
}
