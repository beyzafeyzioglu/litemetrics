import type { AdsParams, UTMParams } from '@litemetrics/core';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function hashString(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const array = Array.from(new Uint8Array(hash));
    return array.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Simple fallback hash
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}

export function parseUTM(): UTMParams | undefined {
  if (typeof location === 'undefined') return undefined;
  const params = new URLSearchParams(location.search);
  const utm: UTMParams = {};
  let hasUtm = false;

  for (const [key, field] of [
    ['utm_source', 'source'],
    ['utm_medium', 'medium'],
    ['utm_campaign', 'campaign'],
    ['utm_term', 'term'],
    ['utm_content', 'content'],
  ] as const) {
    const val = params.get(key);
    if (val) {
      (utm as Record<string, string>)[field] = val;
      hasUtm = true;
    }
  }

  return hasUtm ? utm : undefined;
}

export type ClickIds = Pick<AdsParams, 'gclid' | 'gbraid' | 'wbraid' | 'fbclid'>;

const CLICK_ID_PARAMS = ['gclid', 'gbraid', 'wbraid', 'fbclid'] as const;

/** Parse ad platform click IDs from the current URL. */
export function parseClickIds(): ClickIds | undefined {
  if (typeof location === 'undefined') return undefined;
  const params = new URLSearchParams(location.search);
  const ids: ClickIds = {};
  let hasAny = false;

  for (const key of CLICK_ID_PARAMS) {
    const val = params.get(key);
    if (val) {
      ids[key] = val;
      hasAny = true;
    }
  }

  return hasAny ? ids : undefined;
}

/** Read Meta's _fbp cookie; exists only when a Meta pixel runs on the page. */
export function getFbpCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export function getDayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function now(): number {
  return Date.now();
}
