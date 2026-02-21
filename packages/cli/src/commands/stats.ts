import type { Command } from 'commander';
import type { Metric } from '@litemetrics/core';
import { loadConfig, requireSiteId } from '../config.js';
import { makeAnalyticsClient } from '../client.js';
import { resolveFormat, output, parseFilters, handleError } from '../output.js';

export function registerStatsCommand(program: Command) {
  program
    .command('stats <metric>')
    .description('Query any metric (pageviews, visitors, top_pages, top_referrers, ...)')
    .option('-p, --period <period>', 'Period: 1h, 24h, 7d, 30d, 90d, custom', '24h')
    .option('--from <date>', 'Start date (ISO)')
    .option('--to <date>', 'End date (ISO)')
    .option('-l, --limit <n>', 'Limit results', parseInt)
    .option('--filter <kv...>', 'Filters (key=value, repeatable)')
    .option('-c, --compare', 'Compare with previous period')
    .action(async (metric: string, opts) => {
      const globalOpts = program.opts();
      const format = resolveFormat(globalOpts.format);
      try {
        const config = loadConfig({ url: globalOpts.url, adminSecret: globalOpts.secret, siteId: globalOpts.site });
        const siteId = requireSiteId(config);
        const client = makeAnalyticsClient(config);
        client.setSiteId(siteId);

        const result = await client.getStats(metric as Metric, {
          period: opts.period,
          dateFrom: opts.from,
          dateTo: opts.to,
          limit: opts.limit,
          filters: parseFilters(opts.filter),
          compare: opts.compare,
        });

        const isTopMetric = metric.startsWith('top_');

        if (isTopMetric) {
          const headers = opts.compare ? ['Key', 'Value', 'Change'] : ['Key', 'Value'];
          const rows = result.data.map(d => {
            if (opts.compare) {
              const change = d.change != null ? `${d.change > 0 ? '+' : ''}${d.change}` : '-';
              return [d.key, String(d.value), change];
            }
            return [d.key, String(d.value)];
          });
          const footer = `Total: ${result.total}${result.changePercent != null ? ` (${result.changePercent > 0 ? '+' : ''}${result.changePercent.toFixed(1)}%)` : ''}`;
          output(result, format, { headers, rows, footer });
        } else {
          const headers = opts.compare
            ? ['Metric', 'Total', 'Previous', 'Change']
            : ['Metric', 'Total'];
          const rows = [
            opts.compare
              ? [metric, String(result.total), String(result.previousTotal ?? '-'), result.changePercent != null ? `${result.changePercent > 0 ? '+' : ''}${result.changePercent.toFixed(1)}%` : '-']
              : [metric, String(result.total)],
          ];
          output(result, format, { headers, rows });
        }
      } catch (err) {
        handleError(err, format);
      }
    });
}
