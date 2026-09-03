import { vi, expect } from 'vitest';
import type { TrackerConfig, ClientEvent, ClientContext, CollectPayload, CustomEvent } from '@litemetrics/core';
import { createTracker, type LitemetricsInstance } from './tracker';

// jsdom doesn't implement sendBeacon; define a stub once, so every test file
// importing these utils can vi.spyOn it without repeating the preamble.
if (typeof navigator !== 'undefined' && !('sendBeacon' in navigator)) {
  Object.defineProperty(navigator, 'sendBeacon', {
    value: () => true,
    configurable: true,
    writable: true,
  });
}

const open: LitemetricsInstance[] = [];

/**
 * Create a tracker that the test file's `afterEach` will tear down.
 *
 * A tracker left alive keeps a flush interval and, worse, can complete a send
 * whose visitor id was still resolving. That late request lands on the NEXT
 * test's spies, which is the leak behind issue #13.
 */
export function makeTracker(config: TrackerConfig): LitemetricsInstance {
  const tracker = createTracker(config);
  open.push(tracker);
  return tracker;
}

/**
 * Destroy every tracker made through `makeTracker`.
 *
 * Call this as the FIRST statement of `afterEach`, before `vi.restoreAllMocks()`,
 * so teardown runs while the spies it must not trip are still installed.
 */
export function destroyOpenTrackers(): void {
  open.splice(0).forEach((tracker) => tracker.destroy());
}

export type SentEvent = ClientEvent & ClientContext;

/** Spy on fetch with a 204 response — the shape Transport expects. */
export function spyFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
}

/** Every event dispatched through the fetch spy, across all batches. */
export function sentEvents(fetchSpy: ReturnType<typeof spyFetch>): SentEvent[] {
  return fetchSpy.mock.calls.flatMap((call) => {
    const body = (call[1] as RequestInit | undefined)?.body;
    return (JSON.parse(String(body)) as CollectPayload).events as SentEvent[];
  });
}

/** Wait until a custom event with the given name has been dispatched, then return it. */
export async function waitForEvent(fetchSpy: ReturnType<typeof spyFetch>, name: string): Promise<SentEvent & CustomEvent> {
  let found: (SentEvent & CustomEvent) | undefined;
  await vi.waitFor(() => {
    found = sentEvents(fetchSpy).find(
      (e): e is SentEvent & CustomEvent => e.type === 'event' && (e as CustomEvent).name === name,
    );
    expect(found).toBeDefined();
  });
  return found!;
}
