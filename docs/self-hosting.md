# Self-Hosting

Litemetrics ships as a single Docker image. It bundles the server, dashboard, tracker script, and all API endpoints.

## Quick Deploy

### Railway (one click)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/litemetrics?referralCode=litemetrics)

1. Click the button, add a database plugin: Postgres, ClickHouse, or MongoDB
2. Set `DB_ADAPTER` (`postgres`, `clickhouse`, or `mongodb`), the matching connection URL (`POSTGRES_URL`, `CLICKHOUSE_URL`, or `MONGODB_URL`), and `ADMIN_SECRET` env vars
3. Deploy

### Docker Compose (recommended)

```bash
git clone https://github.com/metehankurucu/litemetrics.git
cd litemetrics
ADMIN_SECRET=your-secret docker compose up -d
```

This starts ClickHouse and Litemetrics together with healthchecks and persistent volumes.

### Docker (standalone)

```bash
docker build -t litemetrics .
docker run -p 3002:3002 \
  -e CLICKHOUSE_URL=http://your-clickhouse:8123 \
  -e ADMIN_SECRET=your-secret \
  litemetrics
```

Open `http://localhost:3002` for the dashboard.

## What the container serves

| Path | Description |
|------|-------------|
| `/` | Dashboard UI |
| `/tracker.js` | Browser tracker script |
| `/litemetrics.js` | Same tracker (alias) |
| `/api/collect` | Event ingestion |
| `/api/stats` | Query analytics |
| `/api/events` | List events |
| `/api/users` | List users |
| `/api/sites` | Site management |
| `/health` | Health check endpoint |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_ADAPTER` | Database adapter (`clickhouse`, `postgres`, or `mongodb`) | `clickhouse` |
| `CLICKHOUSE_URL` | ClickHouse connection URL | `http://localhost:8123` |
| `POSTGRES_URL` | Postgres connection string (when using postgres adapter) | `postgres://postgres:postgres@localhost:5432/litemetrics` |
| `MONGODB_URL` | MongoDB connection string (when using mongodb adapter) | `mongodb://localhost:27017/litemetrics` |
| `ADMIN_SECRET` | Secret for admin login and site management | _(none)_ |
| `PORT` | Server port | `3002` |
| `GEOIP` | Enable GeoIP lookup | `true` |
| `TRUST_PROXY` | Trust X-Forwarded-For headers | `true` |

`DATABASE_URL` and `LITEMETRICS_ADMIN_SECRET` also work as aliases.

## Using Postgres Instead

To use Postgres instead of ClickHouse, set `DB_ADAPTER=postgres`:

```bash
docker run -p 3002:3002 \
  -e DB_ADAPTER=postgres \
  -e POSTGRES_URL=postgres://user:pass@your-postgres:5432/litemetrics \
  -e ADMIN_SECRET=your-secret \
  litemetrics
```

Tables are auto-created on first start. Recommended when you already run Postgres for your app and want one less moving piece. Full feature parity with ClickHouse — every metric, time series, top-N query, and retention cohort returns identical results.

## Using MongoDB Instead

To use MongoDB instead of ClickHouse, set `DB_ADAPTER=mongodb`:

```bash
docker run -p 3002:3002 \
  -e DB_ADAPTER=mongodb \
  -e MONGODB_URL=mongodb://your-mongo:27017/litemetrics \
  -e ADMIN_SECRET=your-secret \
  litemetrics
```

Or with Docker Compose, use the mongodb profile:

```bash
docker compose --profile mongodb up -d
```

## Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name analytics.yoursite.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name analytics.yoursite.com;

    ssl_certificate /etc/letsencrypt/live/analytics.yoursite.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analytics.yoursite.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d analytics.yoursite.com
```

## ClickHouse Notes

For production:
- ClickHouse uses MergeTree for events (partitioned by month) and ReplacingMergeTree for sites
- Data is stored in named Docker volumes (`clickhouse_data`) and persists across container restarts/updates
- ClickHouse handles millions of events with sub-second query latency
- For backups, use `clickhouse-backup` tool

## Postgres Notes

If using the Postgres adapter:
- Schema (tables and indexes) is auto-created on first start
- Events use native `jsonb` for properties/traits and a composite `(site_id, timestamp)` index for fast range scans
- Sites use a `deleted_at` soft-delete column to mirror ClickHouse semantics
- For backups, use `pg_dump` or your provider's snapshot feature (Supabase, Neon, RDS, Railway PG plugin)
- Pgs at scale (>10M events) benefit from monthly partitioning; the schema is partition-friendly but not partitioned by default

## MongoDB Notes

If using MongoDB adapter:
- Enable authentication: `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`
- Set up backups with `mongodump`
- MongoDB Atlas free tier (512MB) handles ~10 apps with 1K users each
- For larger deployments, see [Scaling](./scaling.md)
