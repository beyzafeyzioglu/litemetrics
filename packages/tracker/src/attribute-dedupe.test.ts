import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { ClientEvent, CollectPayload, CustomEvent } from '@litemetrics/core';
import { destroyOpenTrackers, makeTracker } from './test-utils';
import type { LitemetricsInstance } from './tracker';

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

function sentEventNames(fetchSpy: ReturnType<typeof spyFetch>): string[] {
  return fetchSpy.mock.calls
    .flatMap((call) => {
      const body = (call[1] as RequestInit | undefined)?.body;
      return (JSON.parse(String(body)) as CollectPayload).events;
    })
    .filter((e): e is CustomEvent & ClientEvent => e.type === 'event')
    .map((e) => e.name);
}

async function waitForEventNamed(fetchSpy: ReturnType<typeof spyFetch>, name: string): Promise<void> {
  await vi.waitFor(() => {
    expect(sentEventNames(fetchSpy)).toContain(name);
  });
}

/**
 * Prove absence without a wall-clock sleep: events flush in track() order at
 * batchSize 1, so once this sentinel has arrived, anything the earlier clicks
 * queued — including a wrongly-emitted auto event — has already landed.
 */
async function settle(fetchSpy: ReturnType<typeof spyFetch>, tracker: LitemetricsInstance): Promise<void> {
  tracker.track('__settled__');
  await vi.waitFor(() => {
    expect(sentEventNames(fetchSpy)).toContain('__settled__');
  });
}

function mount(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  const el = container.firstElementChild as HTMLElement;
  document.body.appendChild(el);
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

describe('labelled elements produce exactly one event (#18)', () => {
  it('a labelled anchor fires only the declared event — no Outbound Link / Link Click row', async () => {
    const fetchSpy = spyFetch();
    const tracker = makeAutoTracker();

    const link = mount('<a data-litemetrics-event="Signup" href="https://x.com/join">Join</a>');
    click(link);

    await waitForEventNamed(fetchSpy, 'Signup');
    await settle(fetchSpy, tracker);
    const names = sentEventNames(fetchSpy);
    expect(names.filter((n) => n === 'Signup')).toHaveLength(1);
    expect(names).not.toContain('Outbound Link');
    expect(names).not.toContain('Link Click');
  });

  it('a labelled button fires only the declared event — no Button Click row', async () => {
    const fetchSpy = spyFetch();
    const tracker = makeAutoTracker();

    const button = mount('<button data-litemetrics-event="Signup" data-litemetrics-event-plan="pro">Sign up</button>');
    click(button);

    await waitForEventNamed(fetchSpy, 'Signup');
    await settle(fetchSpy, tracker);
    const names = sentEventNames(fetchSpy);
    expect(names.filter((n) => n === 'Signup')).toHaveLength(1);
    expect(names).not.toContain('Button Click');
  });

  it('a click on a child of a labelled ancestor is also owned by the declared event', async () => {
    const fetchSpy = spyFetch();
    const tracker = makeAutoTracker();

    const link = mount('<a data-litemetrics-event="Download" href="/files/report.pdf"><span>Get the report</span></a>');
    const span = link.querySelector('span')!;
    click(span);

    await waitForEventNamed(fetchSpy, 'Download');
    await settle(fetchSpy, tracker);
    const names = sentEventNames(fetchSpy);
    expect(names.filter((n) => n === 'Download')).toHaveLength(1);
    expect(names).not.toContain('File Download');
    expect(names).not.toContain('Link Click');
  });

  it('unlabelled links and buttons keep today\'s auto-capture behaviour exactly', async () => {
    const fetchSpy = spyFetch();
    makeAutoTracker();

    click(mount('<a href="https://external.example/offer">Offer</a>'));
    await waitForEventNamed(fetchSpy, 'Outbound Link');

    click(mount('<button>Plain</button>'));
    await waitForEventNamed(fetchSpy, 'Button Click');

    const names = sentEventNames(fetchSpy);
    expect(names.filter((n) => n === 'Outbound Link')).toHaveLength(1);
    expect(names.filter((n) => n === 'Button Click')).toHaveLength(1);
  });

  it('an empty data-litemetrics-event is unlabelled — auto capture keeps firing, no empty-named event', async () => {
    const fetchSpy = spyFetch();
    const tracker = makeAutoTracker();

    // Valid HTML: <button data-litemetrics-event> serializes as ="". A template
    // binding rendering '' produces the same shape.
    click(mount('<button data-litemetrics-event="">Buy</button>'));
    await waitForEventNamed(fetchSpy, 'Button Click');

    click(mount('<a data-litemetrics-event="" href="https://ext.example/x">Go</a>'));
    await waitForEventNamed(fetchSpy, 'Outbound Link');

    await settle(fetchSpy, tracker);
    const names = sentEventNames(fetchSpy);
    expect(names.filter((n) => n === 'Button Click')).toHaveLength(1);
    expect(names.filter((n) => n === 'Outbound Link')).toHaveLength(1);
    expect(names).not.toContain('');
  });

  it('an empty label inside a labelled ancestor resolves to the ancestor — only the ancestor event fires', async () => {
    const fetchSpy = spyFetch();
    const tracker = makeAutoTracker();

    const wrapper = mount('<div data-litemetrics-event="Outer"><button data-litemetrics-event="">Buy</button></div>');
    const button = wrapper.querySelector('button')!;
    click(button);

    await waitForEventNamed(fetchSpy, 'Outer');
    await settle(fetchSpy, tracker);
    const names = sentEventNames(fetchSpy);
    expect(names.filter((n) => n === 'Outer')).toHaveLength(1);
    expect(names).not.toContain('Button Click');
  });
});
