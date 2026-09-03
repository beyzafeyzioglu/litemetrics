import type { LitemetricsInstance } from './tracker';

const ATTR_EVENT = 'data-litemetrics-event';
const ATTR_PREFIX = 'data-litemetrics-event-';

/**
 * Walk up from `target` to the nearest element whose `data-litemetrics-event`
 * carries a NON-EMPTY name. This is the single definition of "who owns this
 * click": the attribute handler emits from it, and the auto link/button
 * handlers stay silent exactly when it matches — one physical click, one
 * recorded event (#18). Because both sides share this resolver (same walk AND
 * same truthiness test), they cannot drift apart: an empty label
 * (`data-litemetrics-event=""`) is unlabelled for both, so auto capture keeps
 * firing for it, and the walk continues past it to a labelled ancestor.
 */
export function findDeclaredEvent(target: HTMLElement | null): HTMLElement | null {
  let el: HTMLElement | null = target;
  while (el) {
    if (el.getAttribute?.(ATTR_EVENT)) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Initialize data-attribute event tracking.
 * Clicks on elements with `data-litemetrics-event="EventName"` will be auto-tracked.
 * Additional properties via `data-litemetrics-event-*` attributes.
 *
 * Example:
 *   <button data-litemetrics-event="Signup" data-litemetrics-event-plan="pro">
 *   → tracks event "Signup" with { plan: "pro" }
 */
export function initAttributeTracking(instance: LitemetricsInstance): () => void {
  function handleClick(e: Event) {
    const el = findDeclaredEvent(e.target as HTMLElement | null);
    if (!el) return;

    const eventName = el.getAttribute(ATTR_EVENT)!;

    // Collect data-litemetrics-event-* properties
    const properties: Record<string, string> = {};
    const attrs = el.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (attr.name.startsWith(ATTR_PREFIX)) {
        const key = attr.name.slice(ATTR_PREFIX.length);
        properties[key] = attr.value;
      }
    }

    instance.track(
      eventName,
      Object.keys(properties).length > 0 ? properties : undefined,
      { eventSource: 'manual', eventSubtype: 'attribute' }
    );
  }

  document.addEventListener('click', handleClick, true);

  return () => {
    document.removeEventListener('click', handleClick, true);
  };
}
