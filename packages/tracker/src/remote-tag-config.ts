import type { RemoteTagConfig, TrackerConfig } from '@litemetrics/core';
import {
  TAG_CONFIG_PATH,
  STORAGE_KEY_TAG_CONFIG,
  TAG_CONFIG_DEFAULT_TTL,
  TAG_CONFIG_NEGATIVE_TTL,
} from '@litemetrics/core';
import { now } from './utils';

// Per-site remote tag config, fetched from the collector host and cached in
// localStorage. The tracker never interprets the document — it hands it to
// whoever asks via getRemoteTagConfig(). The server identifies the site from the
// request's Origin/Referer, so no key ships in the page.

interface StoredEntry {
  ts: number;
  /** null = the host answered 404 (no config for this origin). */
  body: RemoteTagConfig | null;
}

export interface RemoteTagConfigClient {
  get(): Promise<RemoteTagConfig | null>;
  destroy(): void;
}

function storageGet(): StoredEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TAG_CONFIG);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEntry;
    return typeof parsed.ts === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

function storageSet(entry: StoredEntry): void {
  try {
    localStorage.setItem(STORAGE_KEY_TAG_CONFIG, JSON.stringify(entry));
  } catch {
    // localStorage unavailable — every get() falls through to fetch.
  }
}

function ttlOf(entry: StoredEntry): number {
  if (!entry.body) return TAG_CONFIG_NEGATIVE_TTL;
  const hours = entry.body.maxStaleHours;
  return typeof hours === 'number' && hours > 0 ? hours * 60 * 60 * 1000 : TAG_CONFIG_DEFAULT_TTL;
}

function isRemoteTagConfig(value: unknown): value is RemoteTagConfig {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as RemoteTagConfig).config === 'object' &&
    (value as RemoteTagConfig).config !== null
  );
}

function deriveUrl(collectEndpoint: string): string | null {
  try {
    return new URL(collectEndpoint).origin + TAG_CONFIG_PATH;
  } catch {
    return null;
  }
}

export function createRemoteTagConfigClient(
  collectEndpoint: string,
  option: TrackerConfig['remoteTagConfig'],
): RemoteTagConfigClient | null {
  if (option === false) return null;
  const url = (typeof option === 'object' && option.url) || deriveUrl(collectEndpoint);
  if (!url) return null;

  let inflight: Promise<RemoteTagConfig | null> | null = null;
  const abort = new AbortController();

  async function refresh(): Promise<RemoteTagConfig | null> {
    try {
      const res = await fetch(url as string, { credentials: 'omit', signal: abort.signal });
      if (res.status === 404) {
        storageSet({ ts: now(), body: null });
        return null;
      }
      if (!res.ok) return null; // transient — don't overwrite, retry next get()
      const body: unknown = await res.json();
      if (!isRemoteTagConfig(body)) return null;
      storageSet({ ts: now(), body });
      return body;
    } catch {
      return null; // network failure / aborted — same transient handling
    }
  }

  return {
    get(): Promise<RemoteTagConfig | null> {
      const cached = storageGet();
      if (cached && now() - cached.ts < ttlOf(cached)) {
        return Promise.resolve(cached.body);
      }
      if (!inflight) {
        inflight = refresh().finally(() => {
          inflight = null;
        });
      }
      return inflight;
    },
    destroy(): void {
      abort.abort();
    },
  };
}
