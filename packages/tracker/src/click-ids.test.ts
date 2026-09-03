import { describe, it, expect, afterEach } from 'vitest';
import { vi } from 'vitest';
import { STORAGE_KEY_ADS, STORAGE_KEY_LAST_ACTIVE, SESSION_TIMEOUT, CLICK_ID_TTL } from '@litemetrics/core';
import { destroyOpenTrackers, makeTracker, spyFetch, waitForEvent } from './test-utils';

afterEach(() => {
  // Destroy before restoring mocks so a late flush lands on this test's spies.
  destroyOpenTrackers();
  try { localStorage.clear(); } catch { /* ignore */ }
  document.cookie = '_fbp=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

function makeQuietTracker() {
  return makeTracker({
    siteId: 'site_test',
    endpoint: 'https://x.test/collect',
    autoTrack: false,
    autoSpa: false,
    batchSize: 1,
  });
}

describe('ad click ID capture', () => {
  it('captures click IDs at landing and carries them to events on a later page', async () => {
    history.replaceState(null, '', '/?gclid=abc&fbclid=fb-xyz&utm_source=google');
    const fetchSpy = spyFetch();
    const tracker = makeQuietTracker();

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
    makeQuietTracker().track('Click');

    const event = await waitForEvent(fetchSpy, 'Click');
    expect(event.ads).toMatchObject({ gbraid: 'gb1', wbraid: 'wb1' });
  });

  it('sends no ads field when the landing URL has no click IDs', async () => {
    const fetchSpy = spyFetch();
    makeQuietTracker().track('Plain');

    const event = await waitForEvent(fetchSpy, 'Plain');
    expect(event.ads).toBeUndefined();
  });

  it('forwards the _fbp cookie alongside a captured click ID', async () => {
    history.replaceState(null, '', '/?fbclid=fb-1');
    document.cookie = '_fbp=fb.1.1700000000.123456';
    const fetchSpy = spyFetch();
    makeQuietTracker().track('WithPixel');

    const event = await waitForEvent(fetchSpy, 'WithPixel');
    expect(event.ads).toMatchObject({ fbclid: 'fb-1', fbp: 'fb.1.1700000000.123456' });
  });

  it('never forwards _fbp without a click ID — a visitor who did not click an ad stays cookie-free', async () => {
    document.cookie = '_fbp=fb.1.1700000000.123456';
    const fetchSpy = spyFetch();
    makeQuietTracker().track('NoAd');

    const event = await waitForEvent(fetchSpy, 'NoAd');
    expect(event.ads).toBeUndefined();
  });

  it('a later landing with only one platform\'s ID does not erase the other\'s (retargeting)', async () => {
    history.replaceState(null, '', '/?gclid=abc');
    makeQuietTracker().destroy();

    // Second landing, e.g. an Instagram retargeting click minutes later.
    history.replaceState(null, '', '/?fbclid=xyz');
    const fetchSpy = spyFetch();
    makeQuietTracker().track('Purchase');

    const event = await waitForEvent(fetchSpy, 'Purchase');
    expect(event.ads).toMatchObject({ gclid: 'abc', fbclid: 'xyz' });
  });

  it('persists click IDs across tracker instances within the same session (MPA page loads)', async () => {
    history.replaceState(null, '', '/?gclid=persisted');
    makeQuietTracker().destroy();

    // Next page load: clean URL, same localStorage, session still active.
    history.replaceState(null, '', '/checkout');
    const fetchSpy = spyFetch();
    makeQuietTracker().track('Purchase');

    const event = await waitForEvent(fetchSpy, 'Purchase');
    expect(event.ads?.gclid).toBe('persisted');
  });

  it('survives session expiry — conversion windows are days, not 30 minutes', async () => {
    history.replaceState(null, '', '/?gclid=late-conv');
    makeQuietTracker().destroy();

    // Simulate > SESSION_TIMEOUT of inactivity: the next tracker mints a new session.
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(Date.now() - SESSION_TIMEOUT - 1000));
    history.replaceState(null, '', '/checkout');
    const fetchSpy = spyFetch();
    makeQuietTracker().track('Purchase');

    const event = await waitForEvent(fetchSpy, 'Purchase');
    expect(event.ads?.gclid).toBe('late-conv');
  });

  it('drops click IDs past CLICK_ID_TTL', async () => {
    localStorage.setItem(
      STORAGE_KEY_ADS,
      JSON.stringify({ ts: Date.now() - CLICK_ID_TTL - 1000, ids: { gclid: 'expired' } }),
    );
    const fetchSpy = spyFetch();
    makeQuietTracker().track('TooLate');

    const event = await waitForEvent(fetchSpy, 'TooLate');
    expect(event.ads).toBeUndefined();
  });

  it('drops click IDs on reset()', async () => {
    history.replaceState(null, '', '/?gclid=stale');
    const fetchSpy = spyFetch();
    const tracker = makeQuietTracker();

    history.replaceState(null, '', '/app');
    tracker.reset();
    tracker.track('AfterReset');

    const event = await waitForEvent(fetchSpy, 'AfterReset');
    expect(event.ads).toBeUndefined();
  });
});
