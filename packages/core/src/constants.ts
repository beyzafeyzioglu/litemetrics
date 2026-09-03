export const DEFAULT_BATCH_SIZE = 10;
export const DEFAULT_FLUSH_INTERVAL = 5000;
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const STORAGE_KEY_SESSION = '__litemetrics_sid';
export const STORAGE_KEY_VISITOR = '__litemetrics_vid';
export const STORAGE_KEY_QUEUE = '__litemetrics_q';
export const STORAGE_KEY_OPTOUT = '__litemetrics_optout';
export const STORAGE_KEY_USER = '__litemetrics_uid';
export const STORAGE_KEY_LAST_ACTIVE = '__litemetrics_la';
export const STORAGE_KEY_ADS = '__litemetrics_ads';
// Ad platforms attribute conversions for 7-90 days (Google Ads default 30d
// click-through, Meta 7d click / 90d cookie), so captured click IDs must
// outlive the 30-minute session or most conversions lose their join key.
export const CLICK_ID_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days
export const COLLECT_PATH = '/api/collect';
