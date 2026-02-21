import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface CLIConfig {
  url: string;
  adminSecret: string;
  siteId?: string;
}

interface RCFile {
  url?: string;
  adminSecret?: string;
  siteId?: string;
}

function loadRCFile(): RCFile {
  try {
    const rcPath = join(homedir(), '.litemetricsrc');
    const content = readFileSync(rcPath, 'utf-8');
    return JSON.parse(content) as RCFile;
  } catch {
    return {};
  }
}

export function loadConfig(flags: Partial<CLIConfig>): CLIConfig {
  const rc = loadRCFile();

  const url = flags.url || process.env.LITEMETRICS_URL || rc.url || '';
  const adminSecret = flags.adminSecret || process.env.LITEMETRICS_ADMIN_SECRET || rc.adminSecret || '';
  const siteId = flags.siteId || process.env.LITEMETRICS_SITE_ID || rc.siteId;

  if (!url) {
    console.error('Error: Server URL is required. Use --url, LITEMETRICS_URL env var, or ~/.litemetricsrc');
    process.exit(1);
  }

  if (!adminSecret) {
    console.error('Error: Admin secret is required. Use --secret, LITEMETRICS_ADMIN_SECRET env var, or ~/.litemetricsrc');
    process.exit(1);
  }

  return { url, adminSecret, siteId };
}

export function requireSiteId(config: CLIConfig): string {
  if (!config.siteId) {
    console.error('Error: Site ID is required. Use --site, LITEMETRICS_SITE_ID env var, or ~/.litemetricsrc');
    process.exit(1);
  }
  return config.siteId;
}
