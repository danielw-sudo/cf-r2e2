# R2E2

HELLO WORLD!
Private asset management dashboard for Cloudflare R2. Built on Vue 3 + Tailwind CSS v4 + Hono Workers.

## Stack

- **Frontend**: Vue 3, Pinia, Tailwind CSS v4, Radix Vue
- **Backend**: Hono on Cloudflare Workers
- **Storage**: Cloudflare R2 (multi-bucket)
- **Database**: Cloudflare D1 (media index, tags, settings, usage tracking)
- **AI**: Workers AI (vision analysis, auto-tagging)
- **Auth**: Cloudflare Zero Trust

## Features

**File Management**
- Browse, upload, delete, rename, move files across multiple R2 buckets
- Client-side image optimization (compress, resize, format conversion)
- Multipart upload for large files (95MB+ chunks)
- In-browser preview: images, PDFs, text, markdown, CSV, JSON, audio, video
- HTTP and custom metadata editing
- Presigned URL generation (HMAC-SHA256, 24h expiry)
- Public permanent sharing via a locked-down `share.*` subdomain (bypasses Zero Trust, signed tokens)

**AI**
- On-demand image analysis (title, description, source classification)
- Daily cron analysis (batch 20 images/run across all buckets)
- Auto-tagging with configurable tagger model + prompt
- Separate Vision / Tagger settings with model tier badges
- Usage monitor: daily breakdown, success rates, latency tracking

**Search & Discovery**
- Full-text search across D1-indexed media (title + description)
- Filter by bucket, tag, sort by relevance/date/name
- Inline file preview from search results
- Tag system: AI auto-tagging, manual CRUD, gallery filtering

**Gallery**
- Grid view with lazy-loaded thumbnails
- Filter by type (image/video/document), sort, tag-based filtering
- Context menu with rename, delete, presign, metadata actions

**Sharing**
- `r2.tools4all.ai/shared` tab lists every publicly shared asset with copy-URL + revoke
- `share.tools4all.ai` is a separate, auth-free surface serving only signed share tokens and a read-only gallery; everything else returns a cute 404 that auto-redirects
- Two token flavors: `/share/p/:bucket/:token` (permanent, HMAC-signed) and `/share/t/:bucket/:token` (presigned, 24h)

**Other**
- Dark mode (light/dark/system)
- Upload queue with progress tracking
- Orphan scanner (stale sidecars, dangling media rows, unused tags)
- Daily maintenance cron (batch AI analysis, backfill, orphan count)

## Setup

```bash
pnpm install
```

### Dev

```bash
cd packages/dashboard && pnpm dev
cd packages/worker && npx wrangler dev
```

### Deploy

```bash
cd packages/dashboard && npx vite build
cd packages/worker && npx wrangler deploy
```

Worker: `r2e2` on your custom domain (Zero Trust gated). Copy `wrangler.toml.example` to `wrangler.toml` and fill in your bindings.

### Buckets

Edit `packages/worker/wrangler.toml` — add `[[r2_buckets]]` entries. Binding names must be valid JS identifiers (underscores, not hyphens).

## Structure

```
packages/
  dashboard/     Vue 3 SPA (Vite + Tailwind CSS v4)
  worker/        Hono API on Cloudflare Workers + D1
```

## Acknowledgements

This project is a complete refactor of the original [R2-Explorer](https://github.com/G4brym/R2-Explorer) by Gabriel Massadas. We gratefully acknowledge Gabriel for the original work and panel structure design.

## License

MIT
