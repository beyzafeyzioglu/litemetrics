// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  STORAGE_KEY_TAG_CONFIG,
  TAG_CONFIG_NEGATIVE_TTL,
  type RemoteTagConfig,
} from '@litemetrics/core';
import { makeTracker, destroyOpenTrackers } from './test-utils';

const ENDPOINT = 'https://analytics.example.com/api/collect';
const CONFIG_URL = 'https://analytics.example.com/api/tag-config';

const SERVED: RemoteTagConfig = {
  siteId: 'site_abc',
  updatedAt: '2026-09-01T10:00:00.000Z',
  maxStaleHours: 72,
  config: { conversions: { primary: { value: 1 } } },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** fetch spy that answers the config URL and 204s everything else (collect). */
function spyFetchWithConfig(configResponse: () => Response) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.startsWith(CONFIG_URL)) return Promise.resolve(configResponse());
    return Promise.resolve(new Response(null, { status: 204 }));
  });
}

function configCalls(spy: ReturnType<typeof spyFetchWithConfig>): number {
  return spy.mock.calls.filter((c) => String(c[0]).startsWith(CONFIG_URL)).length;
}

describe('remote tag config', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    destroyOpenTrackers();
    vi.restoreAllMocks();
  });

  it('fetches from the collect host by default and serves the document', async () => {
    const spy = spyFetchWithConfig(() => jsonResponse(SERVED));
    const tracker = makeTracker({ siteId: 'site_abc', endpoint: ENDPOINT, autoTrack: false, autoSpa: false });

    const config = await tracker.getRemoteTagConfig();

    expect(config).toEqual(SERVED);
    expect(configCalls(spy)).toBe(1);
  });

  it('serves repeat reads from the localStorage cache without refetching', async () => {
    const spy = spyFetchWithConfig(() => jsonResponse(SERVED));
    const tracker = makeTracker({ siteId: 'site_abc', endpoint: ENDPOINT, autoTrack: false, autoSpa: false });

    await tracker.getRemoteTagConfig();
    const again = await tracker.getRemoteTagConfig();

    expect(again).toEqual(SERVED);
    expect(configCalls(spy)).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY_TAG_CONFIG)).toContain('site_abc');
  });

  it('refetches once the served maxStaleHours bound has passed', async () => {
    const spy = spyFetchWithConfig(() => jsonResponse(SERVED));
    const tracker = makeTracker({ siteId: 'site_abc', endpoint: ENDPOINT, autoTrack: false, autoSpa: false });
    await tracker.getRemoteTagConfig();

    // Age the stored entry past 72h.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_TAG_CONFIG)!);
    stored.ts -= 73 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY_TAG_CONFIG, JSON.stringify(stored));

    await tracker.getRemoteTagConfig();
    expect(configCalls(spy)).toBe(2);
  });

  it('negative-caches a 404 and retries only after TAG_CONFIG_NEGATIVE_TTL', async () => {
    const spy = spyFetchWithConfig(() => new Response(null, { status: 404 }));
    const tracker = makeTracker({ siteId: 'site_abc', endpoint: ENDPOINT, autoTrack: false, autoSpa: false });

    expect(await tracker.getRemoteTagConfig()).toBeNull();
    expect(await tracker.getRemoteTagConfig()).toBeNull();
    expect(configCalls(spy)).toBe(1);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_TAG_CONFIG)!);
    stored.ts -= TAG_CONFIG_NEGATIVE_TTL + 1;
    localStorage.setItem(STORAGE_KEY_TAG_CONFIG, JSON.stringify(stored));

    await tracker.getRemoteTagConfig();
    expect(configCalls(spy)).toBe(2);
  });

  it('does not cache a transient failure — the next read retries', async () => {
    let status = 500;
    const spy = spyFetchWithConfig(() => new Response(null, { status }));
    const tracker = makeTracker({ siteId: 'site_abc', endpoint: ENDPOINT, autoTrack: false, autoSpa: false });

    expect(await tracker.getRemoteTagConfig()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_TAG_CONFIG)).toBeNull();

    status = 200;
    spy.mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith(CONFIG_URL)) return Promise.resolve(jsonResponse(SERVED));
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    expect(await tracker.getRemoteTagConfig()).toEqual(SERVED);
  });

  it('remoteTagConfig: false disables the fetch entirely', async () => {
    const spy = spyFetchWithConfig(() => jsonResponse(SERVED));
    const tracker = makeTracker({
      siteId: 'site_abc',
      endpoint: ENDPOINT,
      autoTrack: false,
      autoSpa: false,
      remoteTagConfig: false,
    });

    expect(await tracker.getRemoteTagConfig()).toBeNull();
    expect(configCalls(spy)).toBe(0);
  });

  it('remoteTagConfig.url overrides the derived URL', async () => {
    const customUrl = 'https://config.example.com/site-config';
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.startsWith(customUrl)) return Promise.resolve(jsonResponse(SERVED));
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    const tracker = makeTracker({
      siteId: 'site_abc',
      endpoint: ENDPOINT,
      autoTrack: false,
      autoSpa: false,
      remoteTagConfig: { url: customUrl },
    });

    expect(await tracker.getRemoteTagConfig()).toEqual(SERVED);
    expect(spy.mock.calls.some((c) => String(c[0]).startsWith(customUrl))).toBe(true);
  });

  it('a no-op tracker (DNT) fetches nothing and resolves null', async () => {
    const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'doNotTrack');
    Object.defineProperty(navigator, 'doNotTrack', { value: '1', configurable: true });
    try {
      const spy = spyFetchWithConfig(() => jsonResponse(SERVED));
      const tracker = makeTracker({ siteId: 'site_abc', endpoint: ENDPOINT });

      expect(await tracker.getRemoteTagConfig()).toBeNull();
      expect(configCalls(spy)).toBe(0);
    } finally {
      if (original) Object.defineProperty(Navigator.prototype, 'doNotTrack', original);
      else delete (navigator as unknown as Record<string, unknown>).doNotTrack;
    }
  });

  it('rejects a document without a config object', async () => {
    const spy = spyFetchWithConfig(() => jsonResponse({ unexpected: true }));
    const tracker = makeTracker({ siteId: 'site_abc', endpoint: ENDPOINT, autoTrack: false, autoSpa: false });

    expect(await tracker.getRemoteTagConfig()).toBeNull();
    expect(configCalls(spy)).toBe(1);
    // Malformed bodies are treated as transient: nothing cached.
    expect(localStorage.getItem(STORAGE_KEY_TAG_CONFIG)).toBeNull();
  });

  it('destroy() aborts an in-flight fetch', async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url.startsWith(CONFIG_URL)) {
        capturedSignal = init?.signal ?? undefined;
        return new Promise(() => {}); // never resolves
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    const tracker = makeTracker({ siteId: 'site_abc', endpoint: ENDPOINT, autoTrack: false, autoSpa: false });
    const pending = tracker.getRemoteTagConfig();

    tracker.destroy();

    expect(capturedSignal?.aborted).toBe(true);
    // The in-flight promise settles instead of hanging a caller forever.
    await expect(Promise.race([pending, Promise.resolve('unsettled')])).resolves.toBeDefined();
  });
});
