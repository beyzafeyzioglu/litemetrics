import { describe, it, expect } from 'vitest';
import type { EnrichedEvent } from '@litemetrics/core';
import { EVENT_BASE_COLUMNS, buildEventRow, CREATE_EVENTS_TABLE } from './postgres';

/**
 * DB-free guard for the positional coupling between EVENT_BASE_COLUMNS, the
 * hand-written row in buildEventRow, and the CREATE TABLE DDL. Unlike the
 * parity suite (which needs live ClickHouse + Postgres and is skipped in CI),
 * this always runs — a column added to one list but not the others shifts
 * every inserted event one column over, silently.
 */

// Every field populated, so a column whose mapping was forgotten shows up as a
// null in the built row.
const fullEvent: EnrichedEvent = {
  type: 'event',
  siteId: 'site_1',
  timestamp: 1700000000000,
  sessionId: 'sess_1',
  visitorId: 'vis_1',
  url: 'https://x.test/p',
  referrer: 'https://ref.test/',
  title: 'Page',
  name: 'signup',
  properties: { plan: 'pro' },
  eventSource: 'auto',
  eventSubtype: 'link_click',
  pagePath: '/p',
  targetUrlPath: '/t',
  elementSelector: 'a.cta',
  elementText: 'Go',
  scrollDepthPct: 50,
  userId: 'user_1',
  traits: { tier: 'gold' },
  geo: { country: 'US', city: 'NYC', region: 'NY' },
  device: {
    type: 'desktop', browser: 'Chrome', os: 'macOS', osVersion: '14',
    deviceModel: 'Mac', deviceBrand: 'Apple', appVersion: '1.0', appBuild: '42',
    sdkName: 'litemetrics-rn', sdkVersion: '0.5.0',
  },
  language: 'en-US',
  timezone: 'UTC',
  screen: { width: 1920, height: 1080 },
  utm: { source: 's', medium: 'm', campaign: 'c', term: 't', content: 'n' },
  ads: { gclid: 'g', gbraid: 'gb', wbraid: 'wb', fbclid: 'f', fbp: 'fb.1.1.2' },
  ip: '1.2.3.4',
  botFlag: 'signature',
};

function ddlColumnNames(ddl: string): string[] {
  return ddl
    .slice(ddl.indexOf('(') + 1, ddl.lastIndexOf(')'))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[0])
    .filter((token) => /^[a-z_]+$/.test(token));
}

describe('event column alignment (postgres)', () => {
  it('buildEventRow produces exactly one value per EVENT_BASE_COLUMNS entry', () => {
    expect(buildEventRow(fullEvent)).toHaveLength(EVENT_BASE_COLUMNS.length);
  });

  it('a fully-populated event maps no column to null — every column has a mapping', () => {
    expect(buildEventRow(fullEvent)).not.toContain(null);
  });

  it('distinct values land under their own column labels — a swapped pair fails, not just a gap', () => {
    const row = buildEventRow(fullEvent);
    const at = (col: (typeof EVENT_BASE_COLUMNS)[number]) => row[EVENT_BASE_COLUMNS.indexOf(col)];
    expect(at('site_id')).toBe('site_1');
    expect(at('visitor_id')).toBe('vis_1');
    expect(at('event_name')).toBe('signup');
    expect(at('element_text')).toBe('Go');
    expect(at('utm_source')).toBe('s');
    expect(at('utm_content')).toBe('n');
    expect(at('gclid')).toBe('g');
    expect(at('gbraid')).toBe('gb');
    expect(at('wbraid')).toBe('wb');
    expect(at('fbclid')).toBe('f');
    expect(at('fbp')).toBe('fb.1.1.2');
    expect(at('ip')).toBe('1.2.3.4');
    expect(at('bot_flag')).toBe('signature');
  });

  it('EVENT_BASE_COLUMNS matches the DDL columns, in order', () => {
    const ddlColumns = ddlColumnNames(CREATE_EVENTS_TABLE)
      .filter((c) => c !== 'event_id' && c !== 'created_at');
    expect([...EVENT_BASE_COLUMNS]).toEqual(ddlColumns);
  });
});
