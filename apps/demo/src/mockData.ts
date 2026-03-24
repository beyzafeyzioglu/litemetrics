import type {
  Site,
  QueryResult,
  QueryDataPoint,
  Metric,
  Period,
  TimeSeriesResult,
  Granularity,
  EventListItem,
  EventListResult,
  UserDetail,
  UserListResult,
  RetentionResult,
} from '@litemetrics/core';

// ─── Helpers ─────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600_000).toISOString();
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function weekId(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400_000 + oneJan.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ─── Sites ───────────────────────────────────────────────────

export const mockSites: Site[] = [
  {
    siteId: 'demo',
    secretKey: 'sk_demo_1234567890',
    name: 'Acme SaaS',
    type: 'web',
    domain: 'acme.io',
    allowedOrigins: ['https://acme.io'],
    conversionEvents: ['Signup', 'Purchase', 'Trial Start'],
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-03-20T14:30:00Z',
  },
  {
    siteId: 'acme-mobile',
    secretKey: 'sk_demo_0987654321',
    name: 'Acme Mobile',
    type: 'app',
    domain: 'acme.io',
    allowedOrigins: [],
    conversionEvents: ['Signup', 'Purchase'],
    createdAt: '2025-02-01T08:00:00Z',
    updatedAt: '2025-03-18T11:00:00Z',
  },
];

// ─── Overview Stats ──────────────────────────────────────────

const overviewData: Record<string, { total: number; previousTotal: number; changePercent: number }> = {
  pageviews:   { total: 45832, previousTotal: 40810, changePercent: 12.3 },
  visitors:    { total: 12481, previousTotal: 11481, changePercent: 8.7 },
  sessions:    { total: 18234, previousTotal: 16546, changePercent: 10.2 },
  events:      { total: 67459, previousTotal: 58609, changePercent: 15.1 },
  conversions: { total: 1247,  previousTotal: 1018,  changePercent: 22.5 },
};

// ─── Top Lists ───────────────────────────────────────────────

const topData: Record<string, QueryDataPoint[]> = {
  top_pages: [
    { key: '/', value: 12450 },
    { key: '/pricing', value: 8234 },
    { key: '/docs', value: 6120 },
    { key: '/blog/getting-started', value: 4890 },
    { key: '/features', value: 3745 },
    { key: '/about', value: 2981 },
    { key: '/docs/api', value: 2456 },
    { key: '/blog/release-v2', value: 1823 },
    { key: '/contact', value: 1540 },
    { key: '/login', value: 1293 },
  ],
  top_referrers: [
    { key: 'google.com', value: 5420 },
    { key: 'twitter.com', value: 2310 },
    { key: 'github.com', value: 1890 },
    { key: 'producthunt.com', value: 1245 },
    { key: 'dev.to', value: 980 },
    { key: 'news.ycombinator.com', value: 875 },
    { key: 'reddit.com', value: 720 },
    { key: 'linkedin.com', value: 615 },
    { key: '(direct)', value: 3200 },
    { key: 'youtube.com', value: 410 },
  ],
  top_countries: [
    { key: 'US', value: 4520 },
    { key: 'GB', value: 1890 },
    { key: 'DE', value: 1456 },
    { key: 'FR', value: 1120 },
    { key: 'TR', value: 987 },
    { key: 'IN', value: 845 },
    { key: 'CA', value: 723 },
    { key: 'BR', value: 612 },
    { key: 'JP', value: 498 },
    { key: 'AU', value: 430 },
  ],
  top_cities: [
    { key: 'San Francisco', value: 1245 },
    { key: 'London', value: 987 },
    { key: 'Berlin', value: 756 },
    { key: 'New York', value: 698 },
    { key: 'Paris', value: 542 },
    { key: 'Istanbul', value: 489 },
    { key: 'Toronto', value: 423 },
    { key: 'Mumbai', value: 378 },
    { key: 'Tokyo', value: 312 },
    { key: 'Sydney', value: 289 },
  ],
  top_events: [
    { key: 'button_click', value: 8945 },
    { key: 'link_click', value: 6732 },
    { key: 'scroll_depth', value: 5120 },
    { key: 'Signup', value: 842 },
    { key: 'Purchase', value: 312 },
    { key: 'Trial Start', value: 278 },
    { key: 'Download', value: 234 },
    { key: 'share', value: 189 },
    { key: 'search', value: 156 },
    { key: 'video_play', value: 98 },
  ],
  top_conversions: [
    { key: 'Signup', value: 842 },
    { key: 'Purchase', value: 312 },
    { key: 'Trial Start', value: 278 },
  ],
  top_browsers: [
    { key: 'Chrome', value: 7241 },
    { key: 'Safari', value: 2746 },
    { key: 'Firefox', value: 1498 },
    { key: 'Edge', value: 624 },
    { key: 'Other', value: 372 },
  ],
  top_devices: [
    { key: 'Desktop', value: 8113 },
    { key: 'Mobile', value: 3744 },
    { key: 'Tablet', value: 624 },
  ],
  top_os: [
    { key: 'macOS', value: 4120 },
    { key: 'Windows', value: 3890 },
    { key: 'iOS', value: 2340 },
    { key: 'Android', value: 1456 },
    { key: 'Linux', value: 675 },
  ],
  top_os_versions: [
    { key: 'macOS 15.3', value: 2890 },
    { key: 'Windows 11', value: 2456 },
    { key: 'iOS 18.3', value: 1780 },
    { key: 'Android 15', value: 987 },
    { key: 'macOS 14.7', value: 756 },
    { key: 'Windows 10', value: 623 },
  ],
  top_device_models: [
    { key: 'iPhone 16 Pro', value: 1245 },
    { key: 'iPhone 15', value: 890 },
    { key: 'Samsung Galaxy S24', value: 567 },
    { key: 'iPad Pro', value: 423 },
    { key: 'Pixel 9', value: 312 },
  ],
  top_app_versions: [
    { key: '2.4.1', value: 3456 },
    { key: '2.4.0', value: 2890 },
    { key: '2.3.9', value: 1234 },
    { key: '2.3.8', value: 567 },
  ],
  top_exit_pages: [
    { key: '/pricing', value: 3245 },
    { key: '/', value: 2890 },
    { key: '/docs', value: 1567 },
    { key: '/contact', value: 1234 },
    { key: '/login', value: 980 },
  ],
  top_transitions: [
    { key: '/ → /pricing', value: 4520 },
    { key: '/ → /features', value: 3210 },
    { key: '/pricing → /login', value: 2890 },
    { key: '/docs → /docs/api', value: 1980 },
    { key: '/blog/getting-started → /pricing', value: 1456 },
  ],
  top_scroll_pages: [
    { key: '/blog/getting-started', value: 89 },
    { key: '/features', value: 76 },
    { key: '/pricing', value: 72 },
    { key: '/about', value: 68 },
    { key: '/docs', value: 62 },
  ],
  top_button_clicks: [
    { key: 'Get Started Free', value: 3456 },
    { key: 'Start Trial', value: 2890 },
    { key: 'View Pricing', value: 2345 },
    { key: 'Sign Up', value: 1890 },
    { key: 'Download', value: 1234 },
    { key: 'Contact Sales', value: 890 },
    { key: 'Watch Demo', value: 756 },
    { key: 'Learn More', value: 623 },
  ],
  top_link_targets: [
    { key: 'https://docs.acme.io', value: 2890 },
    { key: 'https://github.com/acme/sdk', value: 1567 },
    { key: 'https://twitter.com/acme', value: 1234 },
    { key: 'https://blog.acme.io', value: 980 },
    { key: 'https://status.acme.io', value: 567 },
  ],
  top_utm_sources: [
    { key: 'google', value: 5420 },
    { key: 'twitter', value: 2310 },
    { key: 'newsletter', value: 1890 },
    { key: 'producthunt', value: 1245 },
    { key: 'facebook', value: 890 },
    { key: 'linkedin', value: 615 },
  ],
  top_utm_mediums: [
    { key: 'cpc', value: 4890 },
    { key: 'social', value: 3420 },
    { key: 'email', value: 1890 },
    { key: 'organic', value: 1245 },
    { key: 'referral', value: 890 },
  ],
  top_utm_campaigns: [
    { key: 'spring-launch-2025', value: 3456 },
    { key: 'product-hunt-launch', value: 2890 },
    { key: 'black-friday', value: 1980 },
    { key: 'weekly-newsletter', value: 1567 },
    { key: 'google-brand', value: 1234 },
  ],
  top_utm_terms: [
    { key: 'analytics tool', value: 2345 },
    { key: 'website analytics', value: 1890 },
    { key: 'self hosted analytics', value: 1234 },
    { key: 'privacy analytics', value: 890 },
    { key: 'open source analytics', value: 567 },
  ],
  top_utm_contents: [
    { key: 'hero-cta', value: 2890 },
    { key: 'sidebar-banner', value: 1567 },
    { key: 'footer-link', value: 980 },
    { key: 'blog-inline', value: 756 },
  ],
  top_channels: [
    { key: 'Organic Search', value: 5420 },
    { key: 'Direct', value: 3200 },
    { key: 'Social', value: 2890 },
    { key: 'Paid Search', value: 1890 },
    { key: 'Email', value: 1567 },
    { key: 'Referral', value: 1234 },
  ],
};

// ─── Time Series ─────────────────────────────────────────────

function generateTimeSeries(metric: string, days: number): { date: string; value: number }[] {
  const baseValues: Record<string, number> = {
    pageviews: 6500, visitors: 1800, sessions: 2600, events: 9600, conversions: 178,
  };
  const base = baseValues[metric] ?? 1000;
  const points: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const wf = dow === 0 || dow === 6 ? 0.65 : 1;
    const noise = 0.85 + Math.sin(i * 1.7) * 0.15 + (i % 3) * 0.03;
    points.push({ date: d.toISOString(), value: Math.round(base * wf * noise) });
  }
  return points;
}

function generateHourlyTimeSeries(metric: string): { date: string; value: number }[] {
  const baseValues: Record<string, number> = {
    pageviews: 280, visitors: 75, sessions: 110, events: 420, conversions: 8,
  };
  const base = baseValues[metric] ?? 50;
  const points: { date: string; value: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date();
    d.setHours(d.getHours() - i, 0, 0, 0);
    const h = d.getHours();
    const hf = h < 6 ? 0.2 : h < 9 ? 0.5 : h < 12 ? 0.9 : h < 17 ? 1.0 : h < 21 ? 0.7 : 0.4;
    points.push({ date: d.toISOString(), value: Math.round(base * hf * (0.9 + Math.sin(i * 2.3) * 0.1)) });
  }
  return points;
}

export function getTimeSeriesData(metric: string, period: Period): TimeSeriesResult {
  const days: Record<string, number> = { '1h': 0, '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
  const d = days[period] ?? 7;
  const isHourly = period === '1h' || period === '24h';
  return {
    metric,
    granularity: (isHourly ? 'hour' : d <= 30 ? 'day' : 'week') as Granularity,
    data: isHourly ? generateHourlyTimeSeries(metric) : generateTimeSeries(metric, d || 7),
  };
}

// ─── Events ──────────────────────────────────────────────────

const eventTemplates: Partial<EventListItem>[] = [
  { type: 'pageview', url: 'https://acme.io/', title: 'Acme SaaS - Home', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'US', city: 'San Francisco' } },
  { type: 'pageview', url: 'https://acme.io/pricing', title: 'Pricing', device: { type: 'desktop', browser: 'Safari', os: 'macOS' }, geo: { country: 'GB', city: 'London' } },
  { type: 'event', name: 'button_click', eventSource: 'auto', eventSubtype: 'button_click', elementText: 'Get Started Free', pagePath: '/', device: { type: 'desktop', browser: 'Chrome', os: 'Windows' }, geo: { country: 'DE', city: 'Berlin' } },
  { type: 'pageview', url: 'https://acme.io/docs', title: 'Documentation', device: { type: 'mobile', browser: 'Safari', os: 'iOS' }, geo: { country: 'FR', city: 'Paris' } },
  { type: 'event', name: 'Signup', eventSource: 'manual', eventSubtype: 'custom', properties: { plan: 'free' }, device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'US', city: 'New York' } },
  { type: 'pageview', url: 'https://acme.io/blog/getting-started', title: 'Getting Started Guide', device: { type: 'desktop', browser: 'Firefox', os: 'Linux' }, geo: { country: 'IN', city: 'Mumbai' } },
  { type: 'event', name: 'scroll_depth', eventSource: 'auto', eventSubtype: 'scroll_depth', scrollDepthPct: 75, pagePath: '/features', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'CA', city: 'Toronto' } },
  { type: 'event', name: 'link_click', eventSource: 'auto', eventSubtype: 'link_click', targetUrlPath: 'https://docs.acme.io', pagePath: '/', device: { type: 'mobile', browser: 'Chrome', os: 'Android' }, geo: { country: 'BR', city: 'Sao Paulo' } },
  { type: 'pageview', url: 'https://acme.io/features', title: 'Features', device: { type: 'tablet', browser: 'Safari', os: 'iOS' }, geo: { country: 'JP', city: 'Tokyo' } },
  { type: 'event', name: 'Purchase', eventSource: 'manual', eventSubtype: 'custom', properties: { plan: 'pro', amount: 29 }, device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'US', city: 'Austin' } },
  { type: 'identify', userId: 'user_john', traits: { name: 'John Smith', email: 'john@example.com', plan: 'pro' }, device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'US', city: 'San Francisco' } },
  { type: 'pageview', url: 'https://acme.io/about', title: 'About Us', device: { type: 'desktop', browser: 'Edge', os: 'Windows' }, geo: { country: 'AU', city: 'Sydney' } },
  { type: 'event', name: 'Trial Start', eventSource: 'manual', eventSubtype: 'custom', properties: { plan: 'pro' }, device: { type: 'desktop', browser: 'Safari', os: 'macOS' }, geo: { country: 'GB', city: 'Manchester' } },
  { type: 'pageview', url: 'https://acme.io/contact', title: 'Contact', device: { type: 'mobile', browser: 'Chrome', os: 'Android' }, geo: { country: 'TR', city: 'Istanbul' } },
  { type: 'event', name: 'Download', eventSource: 'manual', eventSubtype: 'file_download', targetUrlPath: '/downloads/acme-sdk.zip', device: { type: 'desktop', browser: 'Firefox', os: 'Linux' }, geo: { country: 'DE', city: 'Munich' } },
  { type: 'pageview', url: 'https://acme.io/login', title: 'Login', device: { type: 'desktop', browser: 'Chrome', os: 'Windows' }, geo: { country: 'US', city: 'Chicago' } },
  { type: 'event', name: 'button_click', eventSource: 'auto', eventSubtype: 'button_click', elementText: 'Start Trial', pagePath: '/pricing', device: { type: 'mobile', browser: 'Safari', os: 'iOS' }, geo: { country: 'FR', city: 'Lyon' } },
  { type: 'pageview', url: 'https://acme.io/docs/api', title: 'API Reference', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'IN', city: 'Bangalore' } },
  { type: 'event', name: 'search', eventSource: 'manual', eventSubtype: 'custom', properties: { query: 'integration guide' }, device: { type: 'desktop', browser: 'Chrome', os: 'Windows' }, geo: { country: 'CA', city: 'Vancouver' } },
  { type: 'pageview', url: 'https://acme.io/blog/release-v2', title: 'Announcing v2.0', device: { type: 'desktop', browser: 'Safari', os: 'macOS' }, geo: { country: 'US', city: 'Seattle' } },
  { type: 'event', name: 'video_play', eventSource: 'manual', eventSubtype: 'custom', properties: { video: 'product-demo' }, device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'GB', city: 'London' } },
  { type: 'event', name: 'share', eventSource: 'manual', eventSubtype: 'custom', properties: { platform: 'twitter' }, device: { type: 'mobile', browser: 'Chrome', os: 'Android' }, geo: { country: 'BR', city: 'Rio de Janeiro' } },
  { type: 'pageview', url: 'https://acme.io/pricing', title: 'Pricing', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'US', city: 'Los Angeles' }, utm: { source: 'google', medium: 'cpc', campaign: 'spring-launch-2025' } },
  { type: 'event', name: 'Signup', eventSource: 'manual', eventSubtype: 'custom', properties: { plan: 'pro' }, device: { type: 'desktop', browser: 'Firefox', os: 'Windows' }, geo: { country: 'DE', city: 'Hamburg' } },
  { type: 'identify', userId: 'user_sarah', traits: { name: 'Sarah Connor', email: 'sarah@startup.io', plan: 'enterprise' }, device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'US', city: 'Austin' } },
  { type: 'pageview', url: 'https://acme.io/', title: 'Acme SaaS - Home', device: { type: 'mobile', browser: 'Safari', os: 'iOS' }, geo: { country: 'JP', city: 'Osaka' }, referrer: 'https://twitter.com' },
  { type: 'event', name: 'rage_click', eventSource: 'auto', eventSubtype: 'rage_click', elementSelector: '#pricing-toggle', pagePath: '/pricing', device: { type: 'desktop', browser: 'Chrome', os: 'Windows' }, geo: { country: 'TR', city: 'Ankara' } },
  { type: 'pageview', url: 'https://acme.io/features', title: 'Features', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'AU', city: 'Melbourne' }, referrer: 'https://producthunt.com' },
  { type: 'event', name: 'outbound_click', eventSource: 'auto', eventSubtype: 'outbound_click', targetUrlPath: 'https://github.com/acme/sdk', pagePath: '/docs', device: { type: 'desktop', browser: 'Chrome', os: 'Linux' }, geo: { country: 'IN', city: 'Delhi' } },
  { type: 'pageview', url: 'https://acme.io/docs', title: 'Documentation', device: { type: 'desktop', browser: 'Safari', os: 'macOS' }, geo: { country: 'US', city: 'Boston' }, referrer: 'https://google.com' },
];

const visitorIds = [
  'vis_a1b2c3d4', 'vis_e5f6g7h8', 'vis_i9j0k1l2', 'vis_m3n4o5p6',
  'vis_q7r8s9t0', 'vis_u1v2w3x4', 'vis_y5z6a7b8', 'vis_c9d0e1f2',
  'vis_g3h4i5j6', 'vis_k7l8m9n0', 'vis_o1p2q3r4', 'vis_s5t6u7v8',
  'vis_w9x0y1z2', 'vis_a3b4c5d6', 'vis_e7f8g9h0',
];

const sessionIds = [
  'ses_aa11', 'ses_bb22', 'ses_cc33', 'ses_dd44', 'ses_ee55',
  'ses_ff66', 'ses_gg77', 'ses_hh88', 'ses_ii99', 'ses_jj00',
];

export function getMockEvents(limit = 30, offset = 0): EventListResult {
  const events: EventListItem[] = eventTemplates.map((tmpl, i) => ({
    id: `evt_${String(i + 1 + offset).padStart(4, '0')}`,
    type: tmpl.type!,
    timestamp: minutesAgo(i * 3 + offset),
    visitorId: visitorIds[i % visitorIds.length],
    sessionId: sessionIds[i % sessionIds.length],
    url: tmpl.url, referrer: tmpl.referrer, title: tmpl.title, name: tmpl.name,
    properties: tmpl.properties, eventSource: tmpl.eventSource, eventSubtype: tmpl.eventSubtype,
    pagePath: tmpl.pagePath, targetUrlPath: tmpl.targetUrlPath, elementSelector: tmpl.elementSelector,
    elementText: tmpl.elementText, scrollDepthPct: tmpl.scrollDepthPct,
    userId: tmpl.userId, traits: tmpl.traits, geo: tmpl.geo, device: tmpl.device,
    language: 'en-US', utm: tmpl.utm,
  }));
  return { events: events.slice(0, limit), total: 284, limit, offset };
}

// ─── Users ───────────────────────────────────────────────────

export const mockUsers: UserDetail[] = [
  { visitorId: 'vis_a1b2c3d4', userId: 'user_john', traits: { name: 'John Smith', email: 'john@example.com', plan: 'pro' }, firstSeen: daysAgo(45), lastSeen: hoursAgo(1), totalEvents: 342, totalPageviews: 189, totalSessions: 28, lastUrl: 'https://acme.io/docs/api', referrer: 'https://google.com', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'US', city: 'San Francisco' }, language: 'en-US', timezone: 'America/Los_Angeles', screen: { width: 2560, height: 1440 } },
  { visitorId: 'vis_e5f6g7h8', userId: 'user_sarah', traits: { name: 'Sarah Connor', email: 'sarah@startup.io', plan: 'enterprise' }, firstSeen: daysAgo(30), lastSeen: hoursAgo(3), totalEvents: 256, totalPageviews: 145, totalSessions: 19, lastUrl: 'https://acme.io/pricing', referrer: 'https://twitter.com', device: { type: 'desktop', browser: 'Safari', os: 'macOS' }, geo: { country: 'US', city: 'Austin' }, language: 'en-US', timezone: 'America/Chicago', screen: { width: 1920, height: 1080 } },
  { visitorId: 'vis_i9j0k1l2', userId: 'user_alex', traits: { name: 'Alex Mueller', email: 'alex@devhaus.de' }, firstSeen: daysAgo(21), lastSeen: hoursAgo(5), totalEvents: 178, totalPageviews: 98, totalSessions: 12, lastUrl: 'https://acme.io/docs', referrer: 'https://github.com', device: { type: 'desktop', browser: 'Firefox', os: 'Linux' }, geo: { country: 'DE', city: 'Berlin' }, language: 'de-DE', timezone: 'Europe/Berlin', screen: { width: 2560, height: 1440 } },
  { visitorId: 'vis_m3n4o5p6', firstSeen: daysAgo(14), lastSeen: hoursAgo(8), totalEvents: 89, totalPageviews: 56, totalSessions: 7, lastUrl: 'https://acme.io/features', referrer: 'https://producthunt.com', device: { type: 'mobile', browser: 'Safari', os: 'iOS' }, geo: { country: 'GB', city: 'London' }, language: 'en-GB', timezone: 'Europe/London', screen: { width: 430, height: 932 } },
  { visitorId: 'vis_q7r8s9t0', userId: 'user_yuki', traits: { name: 'Yuki Tanaka', email: 'yuki@company.jp' }, firstSeen: daysAgo(18), lastSeen: hoursAgo(2), totalEvents: 145, totalPageviews: 87, totalSessions: 11, lastUrl: 'https://acme.io/blog/release-v2', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'JP', city: 'Tokyo' }, language: 'ja-JP', timezone: 'Asia/Tokyo', screen: { width: 1920, height: 1080 } },
  { visitorId: 'vis_u1v2w3x4', firstSeen: daysAgo(7), lastSeen: hoursAgo(12), totalEvents: 45, totalPageviews: 28, totalSessions: 4, lastUrl: 'https://acme.io/pricing', device: { type: 'desktop', browser: 'Edge', os: 'Windows' }, geo: { country: 'FR', city: 'Paris' }, language: 'fr-FR', timezone: 'Europe/Paris', screen: { width: 1920, height: 1080 } },
  { visitorId: 'vis_y5z6a7b8', userId: 'user_priya', traits: { name: 'Priya Sharma', email: 'priya@techcorp.in', plan: 'pro' }, firstSeen: daysAgo(25), lastSeen: hoursAgo(4), totalEvents: 198, totalPageviews: 112, totalSessions: 15, lastUrl: 'https://acme.io/docs/api', referrer: 'https://dev.to', device: { type: 'desktop', browser: 'Chrome', os: 'Windows' }, geo: { country: 'IN', city: 'Mumbai' }, language: 'en-IN', timezone: 'Asia/Kolkata', screen: { width: 1440, height: 900 } },
  { visitorId: 'vis_c9d0e1f2', firstSeen: daysAgo(3), lastSeen: hoursAgo(6), totalEvents: 23, totalPageviews: 15, totalSessions: 2, lastUrl: 'https://acme.io/about', device: { type: 'mobile', browser: 'Chrome', os: 'Android' }, geo: { country: 'BR', city: 'Sao Paulo' }, language: 'pt-BR', timezone: 'America/Sao_Paulo', screen: { width: 412, height: 915 } },
  { visitorId: 'vis_g3h4i5j6', userId: 'user_emma', traits: { name: 'Emma Wilson', email: 'emma@agency.co.uk' }, firstSeen: daysAgo(35), lastSeen: hoursAgo(1), totalEvents: 287, totalPageviews: 156, totalSessions: 22, lastUrl: 'https://acme.io/', referrer: 'https://linkedin.com', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'GB', city: 'Manchester' }, language: 'en-GB', timezone: 'Europe/London', screen: { width: 2560, height: 1440 } },
  { visitorId: 'vis_k7l8m9n0', firstSeen: daysAgo(10), lastSeen: hoursAgo(20), totalEvents: 67, totalPageviews: 42, totalSessions: 5, lastUrl: 'https://acme.io/contact', referrer: 'https://google.com', device: { type: 'tablet', browser: 'Safari', os: 'iOS' }, geo: { country: 'CA', city: 'Toronto' }, language: 'en-CA', timezone: 'America/Toronto', screen: { width: 1024, height: 1366 } },
  { visitorId: 'vis_o1p2q3r4', userId: 'user_mehmet', traits: { name: 'Mehmet Yilmaz', email: 'mehmet@firma.com.tr', plan: 'free' }, firstSeen: daysAgo(20), lastSeen: hoursAgo(7), totalEvents: 134, totalPageviews: 78, totalSessions: 9, lastUrl: 'https://acme.io/features', device: { type: 'desktop', browser: 'Chrome', os: 'Windows' }, geo: { country: 'TR', city: 'Istanbul' }, language: 'tr-TR', timezone: 'Europe/Istanbul', screen: { width: 1920, height: 1080 } },
  { visitorId: 'vis_s5t6u7v8', firstSeen: daysAgo(5), lastSeen: hoursAgo(15), totalEvents: 34, totalPageviews: 21, totalSessions: 3, lastUrl: 'https://acme.io/blog/getting-started', referrer: 'https://news.ycombinator.com', device: { type: 'desktop', browser: 'Firefox', os: 'Linux' }, geo: { country: 'AU', city: 'Sydney' }, language: 'en-AU', timezone: 'Australia/Sydney', screen: { width: 2560, height: 1440 } },
  { visitorId: 'vis_w9x0y1z2', firstSeen: daysAgo(2), lastSeen: hoursAgo(10), totalEvents: 18, totalPageviews: 12, totalSessions: 2, lastUrl: 'https://acme.io/pricing', referrer: 'https://reddit.com', device: { type: 'mobile', browser: 'Chrome', os: 'Android' }, geo: { country: 'US', city: 'Denver' }, language: 'en-US', timezone: 'America/Denver', screen: { width: 393, height: 873 } },
  { visitorId: 'vis_a3b4c5d6', userId: 'user_li', traits: { name: 'Li Wei', email: 'li.wei@tech.cn' }, firstSeen: daysAgo(12), lastSeen: hoursAgo(9), totalEvents: 98, totalPageviews: 62, totalSessions: 8, lastUrl: 'https://acme.io/docs/api', device: { type: 'desktop', browser: 'Chrome', os: 'macOS' }, geo: { country: 'US', city: 'San Jose' }, language: 'zh-CN', timezone: 'America/Los_Angeles', screen: { width: 1920, height: 1080 } },
  { visitorId: 'vis_e7f8g9h0', firstSeen: daysAgo(1), lastSeen: hoursAgo(2), totalEvents: 12, totalPageviews: 8, totalSessions: 1, lastUrl: 'https://acme.io/features', referrer: 'https://youtube.com', device: { type: 'desktop', browser: 'Chrome', os: 'Windows' }, geo: { country: 'US', city: 'Miami' }, language: 'es-US', timezone: 'America/New_York', screen: { width: 1920, height: 1080 } },
];

export function getMockUsers(search?: string, limit = 30, offset = 0): UserListResult {
  let filtered = mockUsers;
  if (search) {
    const q = search.toLowerCase();
    filtered = mockUsers.filter(
      (u) =>
        u.visitorId.toLowerCase().includes(q) ||
        u.userId?.toLowerCase().includes(q) ||
        (u.traits as Record<string, string>)?.name?.toLowerCase().includes(q) ||
        (u.traits as Record<string, string>)?.email?.toLowerCase().includes(q),
    );
  }
  return { users: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset };
}

export function getMockUserDetail(identifier: string): UserDetail {
  return mockUsers.find((u) => u.visitorId === identifier || u.userId === identifier) ?? mockUsers[0];
}

// ─── Retention ───────────────────────────────────────────────

export function getMockRetention(weeks = 8): RetentionResult {
  const cohorts = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const size = 300 + Math.round(Math.sin(i * 1.3) * 100 + 100);
    const retention: number[] = [100];
    for (let w = 1; w <= weeks - 1 - i; w++) {
      const prev = retention[w - 1];
      const drop = prev * (0.15 + (w * 0.02));
      retention.push(Math.round((prev - drop) * 10) / 10);
    }
    cohorts.push({ week: weekId(i), size, retention });
  }
  return { cohorts };
}

// ─── Query Result Builder ────────────────────────────────────

export function getStatsResult(metric: Metric, period: Period = '7d'): QueryResult {
  if (metric in overviewData) {
    const d = overviewData[metric];
    return { metric, period, data: [], total: d.total, previousTotal: d.previousTotal, changePercent: d.changePercent };
  }
  const data = topData[metric] ?? [];
  return { metric, period, data, total: data.reduce((s, d) => s + d.value, 0) };
}
