import { describe, expect, it } from 'vitest';
import { fingerprintError, normalizeMessage } from '../src/clean/fingerprint';
import { redactDeep, sanitizeBreadcrumbs, sanitizeUrl } from '../src/clean/sanitize';

describe('sanitize', () => {
  it('redacts sensitive fields and keeps depth limited', () => {
    const input = {
      token: 'abc123',
      user: { password: 'p@ss', name: 'alice', nested: { apiKey: 'k-1', deep: { deeper: { deepest: { value: 'x' } } } } },
    };
    const result = redactDeep(input);
    expect(result.token).toBe('[REDACTED]');
    expect(result.user.password).toBe('[REDACTED]');
    expect(result.user.nested.apiKey).toBe('[REDACTED]');
    expect(result.user.name).toBe('alice');
  });

  it('sanitizes url query params', () => {
    const url = 'https://example.com/api?token=secret&page=2';
    const result = sanitizeUrl(url);
    expect(result).toContain('token=%5BREDACTED%5D');
    expect(result).toContain('page=2');
  });

  it('limits breadcrumbs to last 50', () => {
    const list = Array.from({ length: 80 }, (_, i) => ({ type: `t${i}`, data: { i } }));
    const result = sanitizeBreadcrumbs(list);
    expect(result).toHaveLength(50);
    expect(result[0].type).toBe('t30');
  });
});

describe('fingerprint', () => {
  it('normalizes dynamic values', () => {
    expect(normalizeMessage('order 1234567890 failed')).toContain('{num}');
    expect(normalizeMessage('uuid abcdef12-3456-7890-abcd-ef1234567890 boom')).toContain('{uuid}');
  });

  it('produces stable fingerprint for same error', () => {
    const data = { type: 'JAVASCRIPT_ERROR', name: 'TypeError', message: 'Cannot read properties of undefined' };
    const stack = [
      { url: 'https://x.com/a.js', func: 'f', line: 1, column: 2 },
      { url: 'https://x.com/a.js', func: 'g', line: 3, column: 4 },
    ];
    expect(fingerprintError(data, stack)).toBe(fingerprintError({ ...data }, [...stack]));
    expect(fingerprintError(data, stack)).not.toBe(fingerprintError({ ...data, name: 'RangeError' }, stack));
  });
});
