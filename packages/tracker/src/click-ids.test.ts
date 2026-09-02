import { describe, it, expect, afterEach, vi } from 'vitest';
import type { ClientEvent, CollectPayload, CustomEvent, ClientContext } from '@litemetrics/core';
import { destroyOpenTrackers, makeTracker } from './test-utils';

// jsdom doesn't implement sendBeacon; define a stub so vi.spyOn can attach.
if (typeof navigator !== 'undefined' && !('sendBeacon' in navigator)) {
  Object.defineProperty(navigator, 'sendBeacon', {
    value: () => true,
    configurable: true,
    writable: true,
  });
}

type SentEvent = ClientEvent & ClientContext;

function spyFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
}

function sentEvents(fetchSpy: ReturnType<typeof spyFetch>): SentEvent[] {
  return fetchSpy.mock.calls.flatMap((call) => {
    const body = (call[1] as RequestInit | undefined)?.body;
    return (JSON.parse(String(body)) as CollectPayload).events as SentEvent[];
  });
}

async function waitForEvent(fetchSpy: ReturnType<typeof spyFetch>, name: string): Promise<SentEvent> {
  let found: SentEvent | undefined;
  await vi.waitFor(() => {
    found = sentEvents(fetchSpy).find((e) => (e as CustomEvent).name === name);
    expect(found).toBeDefined();
  });
  return found!;
}

afterEach(() => {
  // Destroy before restoring mocks so a late flush lands on this test's spies.
  destroyOpenTrackers();
  try { localStorage.clear(); } catch { /* ignore */ }
  document.cookie = '_fbp=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('ad click ID capture', () => {
  it('captures click IDs at landing and carries them to events on a later page', async () => {
    history.replaceState(null, '', '/?gclid=abc&fbclid=fb-xyz&utm_source=google');
    const fetchSpy = spyFetch();

    const tracker = makeTracker({
      siteId: 'site_test',
      endpoint: 'https://x.test/collect',
      autoTrack: false,
      autoSpa: false,
      batchSize: 1,
    });

    // SPA navigation: the params are gone from the URL before the conversion-shaped click.
    history.replaceState(null, '', '/pricing');
    tracker.track('Signup');

    const event = await waitForEvent(fetchSpy, 'Signup');
    expect(event.ads).toMatchObject({ gclid: 'abc', fbclid: 'fb-xyz' });
    // UTM stays URL-derived and is absent after navigation — click IDs must not be.
    expect(event.utm).toBeUndefined();
  });

  it('captures gbraid and wbraid variants', async () => {
    history.replaceState(null, '', '/?gbraid=gb1&wbraid=wb1');
    const fetchSpy = spyFetch();

    const tracker = makeTracker({
      siteId: 'site_test',
      endpoint: 'https://x.test/collect',
      autoTrack: false,
      autoSpa: false,
      batchSize: 1,
    });
    tracker.track('Click');

    const event = await waitForEvent(fetchSpy, 'Click');
    expect(event.ads).toMatchObject({ gbraid: 'gb1', wbraid: 'wb1' });
  });

  it('sends no ads field when the landing URL has no click IDs and no _fbp cookie exists', async () => {
    const fetchSpy = spyFetch();

    const tracker = makeTracker({
      siteId: 'site_test',
      endpoint: 'https://x.test/collect',
      autoTrack: false,
      autoSpa: false,
      batchSize: 1,
    });
    tracker.track('Plain');

    const event = await waitForEvent(fetchSpy, 'Plain');
    expect(event.ads).toBeUndefined();
  });

  it('forwards the _fbp cookie when a Meta pixel has set it', async () => {
    document.cookie = '_fbp=fb.1.1700000000.123456';
    const fetchSpy = spyFetch();

    const tracker = makeTracker({
      siteId: 'site_test',
      endpoint: 'https://x.test/collect',
      autoTrack: false,
      autoSpa: false,
      batchSize: 1,
    });
    tracker.track('WithPixel');

    const event = await waitForEvent(fetchSpy, 'WithPixel');
    expect(event.ads?.fbp).toBe('fb.1.1700000000.123456');
  });

  it('persists click IDs across tracker instances within the same session (MPA page loads)', async () => {
    history.replaceState(null, '', '/?gclid=persisted');
    const first = makeTracker({
      siteId: 'site_test',
      endpoint: 'https://x.test/collect',
      autoTrack: false,
      autoSpa: false,
    });
    first.destroy();

    // Next page load: clean URL, same localStorage, session still active.
    history.replaceState(null, '', '/checkout');
    const fetchSpy = spyFetch();
    const second = makeTracker({
      siteId: 'site_test',
      endpoint: 'https://x.test/collect',
      autoTrack: false,
      autoSpa: false,
      batchSize: 1,
    });
    second.track('Purchase');

    const event = await waitForEvent(fetchSpy, 'Purchase');
    expect(event.ads?.gclid).toBe('persisted');
  });

  it('drops click IDs on reset() — they are session-scoped, not identity', async () => {
    history.replaceState(null, '', '/?gclid=stale');
    const fetchSpy = spyFetch();

    const tracker = makeTracker({
      siteId: 'site_test',
      endpoint: 'https://x.test/collect',
      autoTrack: false,
      autoSpa: false,
      batchSize: 1,
    });

    history.replaceState(null, '', '/app');
    tracker.reset();
    tracker.track('AfterReset');

    const event = await waitForEvent(fetchSpy, 'AfterReset');
    expect(event.ads).toBeUndefined();
  });
});
