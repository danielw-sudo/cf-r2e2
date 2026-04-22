import type { AppEnv } from "../../types";
import { getBuckets } from "../../foundation/buckets";
import { isImage } from "../ai/constants";
import { upsertMedia } from "../db/queries";
import { putSetting } from "../settings/settingsD1";

const BACKFILL_BATCH = 30;
const ORPHAN_BATCH = 50;

interface MaintenanceReport {
	ranAt: string;
	backfill: number;
	orphans: number;
}

/** Run daily maintenance: backfill D1 index + count orphans */
export async function runMaintenance(env: AppEnv): Promise<void> {
	const backfilled = await autoBackfill(env);
	const orphanCount = await countOrphans(env);

	const report: MaintenanceReport = {
		ranAt: new Date().toISOString().replace("T", " ").slice(0, 16),
		backfill: backfilled,
		orphans: orphanCount,
	};

	await putSetting(env.DB, "maintenance.value", JSON.stringify(report));
	console.log(`[maintenance] backfill=${backfilled}, orphans=${orphanCount}`);
}

async function autoBackfill(env: AppEnv): Promise<number> {
	const buckets = getBuckets(env);
	let processed = 0;

	for (const { name, bucket } of buckets) {
		if (processed >= BACKFILL_BATCH) break;
		let cursor: string | undefined;
		let truncated = true;

		while (truncated && processed < BACKFILL_BATCH) {
			const list = await bucket.list({ limit: 100, cursor });
			truncated = list.truncated;
			cursor = list.truncated ? list.cursor : undefined;

			for (const obj of list.objects) {
				if (processed >= BACKFILL_BATCH) break;
				if (!obj.key.endsWith(".meta.json")) continue;
				const imageKey = obj.key.replace(/\.meta\.json$/, "");
				if (!isImage(imageKey)) continue;

				// Skip if already indexed
				const existing = await env.DB
					.prepare("SELECT id FROM media WHERE bucket = ? AND key = ?")
					.bind(name, imageKey)
					.first();
				if (existing) continue;

				try {
					const metaObj = await bucket.get(obj.key);
					if (!metaObj) continue;
					const meta = await metaObj.json<Record<string, unknown>>();
					const imageHead = await bucket.head(imageKey);
					await upsertMedia(env.DB, {
						bucket: name, key: imageKey,
						title: (meta.title as string) || undefined,
						description: (meta.description as string) || undefined,
						source: (meta.source as string) || undefined,
						contentType: imageHead?.httpMetadata?.contentType || "unknown",
						size: imageHead?.size,
						uploadedAt: imageHead?.uploaded?.toISOString(),
					});
					processed++;
				} catch (err) {
					console.error(`[maintenance] backfill error ${name}/${obj.key}:`, err);
				}
			}
		}
	}

	return processed;
}

async function countOrphans(env: AppEnv): Promise<number> {
	const buckets = getBuckets(env);
	const bucketMap = new Map(buckets.map((b) => [b.name, b.bucket]));
	let count = 0;

	// Orphaned sidecars (spot-check first bucket, limited)
	for (const { name, bucket } of buckets) {
		const list = await bucket.list({ limit: 50 });
		for (const obj of list.objects) {
			if (!obj.key.endsWith(".meta.json")) continue;
			const parent = await bucket.head(obj.key.replace(/\.meta\.json$/, ""));
			if (!parent) count++;
		}
		break; // spot-check only first bucket to limit API calls
	}

	// Stale media rows
	const rows = await env.DB
		.prepare("SELECT id, bucket, key FROM media LIMIT ?")
		.bind(ORPHAN_BATCH)
		.all<{ id: number; bucket: string; key: string }>();
	for (const row of rows.results) {
		const b = bucketMap.get(row.bucket);
		if (!b) { count++; continue; }
		const obj = await b.head(row.key);
		if (!obj) count++;
	}

	// Stale tags
	const tagResult = await env.DB
		.prepare("SELECT COUNT(*) as c FROM tags WHERE usage_count = 0")
		.first<{ c: number }>();
	count += tagResult?.c ?? 0;

	return count;
}
