import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { ClientEvent, CollectPayload, CustomEvent } from '@litemetrics/core';
import { destroyOpenTrackers, makeTracker } from './test-utils';

// jsdom doesn't implement sendBeacon; define a stub so vi.spyOn can attach.
if (typeof navigator !== 'undefined' && !('sendBeacon' in navigator)) {
  Object.defineProperty(navigator, 'sendBeacon', {
    value: () => true,
    configurable: true,
    writable: true,
  });
}

function spyFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
}

function sentEvents(fetchSpy: ReturnType<typeof spyFetch>): ClientEvent[] {
  return fetchSpy.mock.calls.flatMap((call) => {
    const body = (call[1] as RequestInit | undefined)?.body;
    return (JSON.parse(String(body)) as CollectPayload).events;
  });
}

async function waitForEvent(fetchSpy: ReturnType<typeof spyFetch>, name: string): Promise<CustomEvent> {
  let found: CustomEvent | undefined;
  await vi.waitFor(() => {
    found = sentEvents(fetchSpy).find(
      (e): e is CustomEvent & ClientEvent => e.type === 'event' && (e as CustomEvent).name === name,
    );
    expect(found).toBeDefined();
  });
  return found!;
}

/**
 * Build an element from HTML and attach it to the body. jsdom implements no
 * `innerText`, so approximate it from `textContent` — a getter, not a canned
 * string, so the elementText assertions still run through getElementText's
 * real trim / whitespace-collapse / 80-char-cap transformation.
 */
function mount(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  const el = container.firstElementChild as HTMLElement;
  document.body.appendChild(el);
  if (el.innerText === undefined) {
    Object.defineProperty(el, 'innerText', { get: () => el.textContent ?? '', configurable: true });
  }
  return el;
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

// Anchors would make jsdom attempt (unimplemented) navigation; cancel the
// default action after the tracker's capture-phase listeners have run.
const cancelNavigation = (e: Event) => e.preventDefault();

beforeEach(() => {
  document.addEventListener('click', cancelNavigation);
});

afterEach(() => {
  // Destroy before restoring mocks so a late flush lands on this test's spies.
  destroyOpenTrackers();
  document.removeEventListener('click', cancelNavigation);
  document.body.innerHTML = '';
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.restoreAllMocks();
});

function makeAutoTracker() {
  return makeTracker({
    siteId: 'site_test',
    endpoint: 'https://x.test/collect',
    autoSpa: false,
    autoScrollDepth: false,
    autoRageClicks: false,
    batchSize: 1,
  });
}

describe('link click element identity', () => {
  it('a tel: link carries elementText and elementSelector', async () => {
    const fetchSpy = spyFetch();
    makeAutoTracker();

    const link = mount('<a class="cta primary" href="tel:+901234567890">Hemen Ara</a>');
    click(link);

    const event = await waitForEvent(fetchSpy, 'Link Click');
    expect(event.eventSubtype).toBe('link_click');
    expect(event.elementText).toBe('Hemen Ara');
    expect(event.elementSelector).toBe('a.cta.primary');
    // Existing payload shape unchanged.
    expect(event.pagePath).toBeDefined();
    expect(event.targetUrlPath).toBeDefined();
  });

  it('Outbound Link carries both identity fields', async () => {
    const fetchSpy = spyFetch();
    makeAutoTracker();

    const link = mount('<a id="partner-link" href="https://external.example/offer">Partner Offer</a>');
    click(link);

    const event = await waitForEvent(fetchSpy, 'Outbound Link');
    expect(event.eventSubtype).toBe('outbound_click');
    expect(event.elementText).toBe('Partner Offer');
    expect(event.elementSelector).toBe('#partner-link');
  });

  it('File Download carries both identity fields', async () => {
    const fetchSpy = spyFetch();
    makeAutoTracker();

    const link = mount('<a href="/files/whitepaper.pdf">Download Whitepaper</a>');
    click(link);

    const event = await waitForEvent(fetchSpy, 'File Download');
    expect(event.eventSubtype).toBe('file_download');
    expect(event.elementText).toBe('Download Whitepaper');
    expect(event.elementSelector).toBe('a');
    expect(event.properties).toMatchObject({ extension: 'pdf' });
  });

  it('an icon link with no visible text omits elementText but keeps elementSelector', async () => {
    const fetchSpy = spyFetch();
    makeAutoTracker();

    const link = mount('<a class="icon-wa" href="https://wa.me/901234567890"><svg></svg></a>');
    click(link);

    const event = await waitForEvent(fetchSpy, 'Outbound Link');
    expect(event.elementText).toBeUndefined();
    expect(event.elementSelector).toBe('a.icon-wa');
  });

  it('collapses whitespace and caps elementText at 80 characters', async () => {
    const fetchSpy = spyFetch();
    makeAutoTracker();

    const long = 'A'.repeat(100);
    const link = mount(`<a href="https://external.example/x">  multi\n   word   ${long}  </a>`);
    click(link);

    const event = await waitForEvent(fetchSpy, 'Outbound Link');
    expect(event.elementText).toBe(`multi word ${long}`.slice(0, 80));
  });

  it('a button wrapped in an anchor is attributed to the link branch with the anchor identity', async () => {
    const fetchSpy = spyFetch();
    makeAutoTracker();

    const link = mount('<a id="book-link" href="https://booking.example/r"><button>Book</button></a>');
    const button = link.querySelector('button')!;
    click(button);

    const event = await waitForEvent(fetchSpy, 'Outbound Link');
    expect(event.elementSelector).toBe('#book-link');
    // The button branch keeps skipping buttons inside anchors — no duplicate row.
    expect(sentEvents(fetchSpy).some((e) => (e as CustomEvent).name === 'Button Click')).toBe(false);
  });
});
