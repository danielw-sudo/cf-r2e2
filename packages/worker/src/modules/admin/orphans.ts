import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { getBuckets } from "../../foundation/buckets";

interface OrphanItem {
	type: "sidecar" | "media" | "stale_tag";
	bucket?: string;
	key?: string;
	id?: number;
	name?: string;
}

const BATCH = 50;

export class ScanOrphans extends OpenAPIRoute {
	schema = {
		operationId: "scan-orphans",
		tags: ["Admin"],
		summary: "Scan for orphaned sidecars, media rows, and stale tags",
	};

	async handle(c: AppContext) {
		const type = c.req.query("type") || "all";
		const bucketFilter = c.req.query("bucket") || undefined;
		const orphans: OrphanItem[] = [];

		if (type === "all" || type === "sidecar") {
			await this.scanSidecars(c, orphans, bucketFilter);
		}
		if (type === "all" || type === "media") {
			await this.scanMedia(c, orphans, bucketFilter);
		}
		if (type === "all" || type === "stale_tag") {
			await this.scanStaleTags(c, orphans);
		}

		return c.json({ orphans, count: orphans.length });
	}

	private async scanSidecars(c: AppContext, out: OrphanItem[], filterBucket?: string) {
		const buckets = getBuckets(c.env);
		for (const { name, bucket } of buckets) {
			if (filterBucket && name !== filterBucket) continue;
			let cursor: string | undefined;
			let truncated = true;
			while (truncated && out.length < BATCH) {
				const list = await bucket.list({ limit: 100, cursor });
				truncated = list.truncated;
				cursor = list.truncated ? list.cursor : undefined;
				for (const obj of list.objects) {
					if (out.length >= BATCH) break;
					if (!obj.key.endsWith(".meta.json")) continue;
					const parentKey = obj.key.replace(/\.meta\.json$/, "");
					const parent = await bucket.head(parentKey);
					if (!parent) out.push({ type: "sidecar", bucket: name, key: obj.key });
				}
			}
		}
	}

	private async scanMedia(c: AppContext, out: OrphanItem[], filterBucket?: string) {
		const buckets = getBuckets(c.env);
		const bucketMap = new Map(buckets.map((b) => [b.name, b.bucket]));
		const sql = filterBucket
			? "SELECT id, bucket, key FROM media WHERE bucket = ? LIMIT ?"
			: "SELECT id, bucket, key FROM media LIMIT ?";
		const binds = filterBucket ? [filterBucket, BATCH * 2] : [BATCH * 2];
		const rows = await c.env.DB.prepare(sql).bind(...binds)
			.all<{ id: number; bucket: string; key: string }>();
		for (const row of rows.results) {
			if (out.length >= BATCH) break;
			const b = bucketMap.get(row.bucket);
			if (!b) { out.push({ type: "media", id: row.id, bucket: row.bucket, key: row.key }); continue; }
			const obj = await b.head(row.key);
			if (!obj) out.push({ type: "media", id: row.id, bucket: row.bucket, key: row.key });
		}
	}

	private async scanStaleTags(c: AppContext, out: OrphanItem[]) {
		const rows = await c.env.DB
			.prepare("SELECT id, name, slug FROM tags WHERE usage_count = 0 LIMIT ?")
			.bind(BATCH)
			.all<{ id: number; name: string; slug: string }>();
		for (const row of rows.results) {
			out.push({ type: "stale_tag", id: row.id, name: row.name });
		}
	}
}

export class CleanOrphans extends OpenAPIRoute {
	schema = {
		operationId: "clean-orphans",
		tags: ["Admin"],
		summary: "Delete selected orphan entries",
	};

	async handle(c: AppContext) {
		const { items } = await c.req.json<{ items: OrphanItem[] }>();
		if (!items?.length) return c.json({ error: "No items" }, 400);

		const buckets = getBuckets(c.env);
		const bucketMap = new Map(buckets.map((b) => [b.name, b.bucket]));
		let deleted = 0;
		let errors = 0;

		for (const item of items) {
			try {
				if (item.type === "sidecar" && item.bucket && item.key) {
					const b = bucketMap.get(item.bucket);
					if (!b) { errors++; continue; }
					await b.delete(item.key);
					deleted++;
				} else if (item.type === "media" && item.id) {
					await c.env.DB.prepare("DELETE FROM media WHERE id = ?").bind(item.id).run();
					deleted++;
				} else if (item.type === "stale_tag" && item.id) {
					await c.env.DB.prepare("DELETE FROM media_tags WHERE tag_id = ?").bind(item.id).run();
					await c.env.DB.prepare("DELETE FROM tags WHERE id = ?").bind(item.id).run();
					deleted++;
				}
			} catch (err) {
				errors++;
				console.error("[orphans] Clean error:", err);
			}
		}

		return c.json({ deleted, errors });
	}
}
