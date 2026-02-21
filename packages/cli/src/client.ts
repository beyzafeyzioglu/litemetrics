import { createClient, createSitesClient } from '@litemetrics/client';
import type { CLIConfig } from './config.js';

export function makeAnalyticsClient(config: CLIConfig) {
  return createClient({
    baseUrl: config.url,
    siteId: config.siteId || 'default',
    headers: { 'X-Litemetrics-Admin-Secret': config.adminSecret },
  });
}

export function makeSitesClient(config: CLIConfig) {
  return createSitesClient({
    baseUrl: config.url,
    adminSecret: config.adminSecret,
  });
}
