// This file replaces @litemetrics/client via Vite alias.
// All types re-exported from @litemetrics/core (avoids circular alias).

export type {
  Metric, Period, QueryResult, QueryDataPoint, Site, SiteType,
  CreateSiteRequest, UpdateSiteRequest, EventType, EventListParams,
  EventListResult, EventListItem, UserListParams, UserListResult,
  UserDetail, Granularity, TimeSeriesParams, TimeSeriesResult,
  TimeSeriesPoint, RetentionParams, RetentionResult, RetentionCohort,
} from '@litemetrics/core';

import type {
  Metric, Period, QueryResult, TimeSeriesResult,
  EventListResult, UserListResult, UserDetail, RetentionResult,
  Site, CreateSiteRequest, UpdateSiteRequest,
} from '@litemetrics/core';

import {
  getStatsResult, getTimeSeriesData, getMockEvents,
  getMockUsers, getMockUserDetail, getMockRetention, mockSites,
} from './mockData';

// ─── Config types ────────────────────────────────────────────

export interface LitemetricsClientConfig {
  baseUrl: string;
  siteId: string;
  secretKey?: string;
  endpoint?: string;
  headers?: Record<string, string>;
}

export interface StatsOptions {
  period?: Period;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  filters?: Record<string, string>;
  compare?: boolean;
  timezone?: string;
}

export interface TimeSeriesOptions {
  period?: Period;
  dateFrom?: string;
  dateTo?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  filters?: Record<string, string>;
  timezone?: string;
}

export interface EventsListOptions {
  type?: 'pageview' | 'event' | 'identify';
  eventName?: string;
  eventNames?: string[];
  eventSource?: 'auto' | 'manual';
  visitorId?: string;
  userId?: string;
  period?: Period;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface UsersListOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RetentionOptions {
  period?: Period;
  weeks?: number;
}

export interface SitesClientConfig {
  baseUrl: string;
  adminSecret: string;
  endpoint?: string;
}

// ─── Mock LitemetricsClient ──────────────────────────────────

export class LitemetricsClient {
  constructor(_config: LitemetricsClientConfig) {}
  setSiteId(_siteId: string): void {}

  async getStats(metric: Metric, options?: StatsOptions): Promise<QueryResult> {
    return getStatsResult(metric, options?.period ?? '7d');
  }
  async getPageviews(o?: StatsOptions) { return this.getStats('pageviews', o); }
  async getVisitors(o?: StatsOptions) { return this.getStats('visitors', o); }
  async getSessions(o?: StatsOptions) { return this.getStats('sessions', o); }
  async getEvents(o?: StatsOptions) { return this.getStats('events', o); }
  async getTopPages(o?: StatsOptions) { return this.getStats('top_pages', o); }
  async getTopReferrers(o?: StatsOptions) { return this.getStats('top_referrers', o); }
  async getTopCountries(o?: StatsOptions) { return this.getStats('top_countries', o); }
  async getTopCities(o?: StatsOptions) { return this.getStats('top_cities', o); }
  async getTopEvents(o?: StatsOptions) { return this.getStats('top_events', o); }
  async getTopDevices(o?: StatsOptions) { return this.getStats('top_devices', o); }
  async getTopBrowsers(o?: StatsOptions) { return this.getStats('top_browsers', o); }
  async getTopOS(o?: StatsOptions) { return this.getStats('top_os', o); }

  async getOverview(
    metrics: Metric[] = ['pageviews', 'visitors', 'sessions', 'events', 'conversions'],
    options?: StatsOptions,
  ): Promise<Record<Metric, QueryResult>> {
    return Object.fromEntries(metrics.map((m) => [m, getStatsResult(m, options?.period ?? '7d')])) as Record<Metric, QueryResult>;
  }

  async getTimeSeries(
    metric: 'pageviews' | 'visitors' | 'sessions' | 'events' | 'conversions',
    options?: TimeSeriesOptions,
  ): Promise<TimeSeriesResult> {
    return getTimeSeriesData(metric, options?.period ?? '7d');
  }

  async getEventsList(options?: EventsListOptions): Promise<EventListResult> {
    return getMockEvents(options?.limit ?? 30, options?.offset ?? 0);
  }
  async getUsers(options?: UsersListOptions): Promise<UserListResult> {
    return getMockUsers(options?.search, options?.limit ?? 30, options?.offset ?? 0);
  }
  async getUserDetail(identifier: string): Promise<UserDetail> {
    return getMockUserDetail(identifier);
  }
  async getUserEvents(_id: string, options?: EventsListOptions): Promise<EventListResult> {
    return getMockEvents(options?.limit ?? 30, options?.offset ?? 0);
  }
  async getRetention(options?: RetentionOptions): Promise<RetentionResult> {
    return getMockRetention(options?.weeks ?? 8);
  }
}

// ─── Mock SitesClient ────────────────────────────────────────

export class SitesClient {
  constructor(_config: SitesClientConfig) {}

  async listSites(): Promise<{ sites: Site[]; total: number }> {
    return { sites: mockSites, total: mockSites.length };
  }
  async getSite(siteId: string): Promise<{ site: Site }> {
    return { site: mockSites.find((s) => s.siteId === siteId) ?? mockSites[0] };
  }
  async createSite(body: CreateSiteRequest): Promise<{ site: Site }> {
    return { site: { siteId: 'new-site', secretKey: 'sk_new', name: body.name, type: body.type, domain: body.domain, allowedOrigins: body.allowedOrigins, conversionEvents: body.conversionEvents, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } };
  }
  async updateSite(siteId: string, body: UpdateSiteRequest): Promise<{ site: Site }> {
    const e = mockSites.find((s) => s.siteId === siteId) ?? mockSites[0];
    return { site: { ...e, ...body, updatedAt: new Date().toISOString() } };
  }
  async deleteSite(): Promise<{ ok: boolean }> { return { ok: true }; }
  async regenerateSecret(siteId: string): Promise<{ site: Site }> {
    const e = mockSites.find((s) => s.siteId === siteId) ?? mockSites[0];
    return { site: { ...e, secretKey: 'sk_regen_' + Date.now(), updatedAt: new Date().toISOString() } };
  }
}

// ─── Factory functions ───────────────────────────────────────

export function createClient(config: LitemetricsClientConfig): LitemetricsClient {
  return new LitemetricsClient(config);
}
export function createSitesClient(config: SitesClientConfig): SitesClient {
  return new SitesClient(config);
}
