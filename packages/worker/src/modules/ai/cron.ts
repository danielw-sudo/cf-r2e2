import type { AppEnv } from "../../types";
import { extractText, isImage, parseMeta, toDataUri } from "./constants";
import { loadAiConfig } from "../settings/aiSettings";
import { upsertMedia } from "../db/queries";
import { getBuckets } from "../../foundation/buckets";
import { withTimeout } from "../../foundation/withTimeout";
import { logUsage } from "./usage";
import { runMaintenance } from "../admin/maintenance";

const DEFAULT_BATCH_LIMIT = 20;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
const AI_TIMEOUT_MS = 60_000;

/** Run scheduled image analysis across all buckets */
export async function handleCron(env: AppEnv): Promise<void> {
	const batchLimit = Number(env.AI_BATCH_LIMIT) || DEFAULT_BATCH_LIMIT;
	const maxSize = Number(env.AI_MAX_FILE_SIZE) || DEFAULT_MAX_SIZE;
	const aiConfig = await loadAiConfig(env);
	const model = aiConfig.model;

	const buckets = getBuckets(env);
	let processed = 0;
	let failed = 0;

	for (const { name, bucket } of buckets) {
		if (processed >= batchLimit) break;

		let cursor: string | undefined;
		let truncated = true;

		while (truncated && processed < batchLimit) {
			const list = await bucket.list({ limit: 100, cursor });
			truncated = list.truncated;
			cursor = list.truncated ? list.cursor : undefined;

			for (const obj of list.objects) {
				if (processed >= batchLimit) break;
				if (!isImage(obj.key)) continue;
				if (obj.key.includes(".meta.json")) continue;

				const existing = await bucket.head(`${obj.key}.meta.json`);
				if (existing) continue;
				if (obj.size > maxSize) continue;

				const start = Date.now();
				try {
					const full = await bucket.get(obj.key);
					if (!full) continue;

					const bytes = new Uint8Array(await full.arrayBuffer());
					const ct = full.httpMetadata?.contentType || "image/jpeg";
					const dataUri = toDataUri(bytes, ct);

					const response = await withTimeout(
						env.AI.run(model as any, {
							messages: [
								{ role: "system", content: aiConfig.prompt },
								{ role: "user", content: [
									{ type: "image_url", image_url: { url: dataUri } },
									{ type: "text", text: "Analyze this image." },
								] },
							],
							max_tokens: aiConfig.maxTokens,
						} as any),
						AI_TIMEOUT_MS,
						"cron-analyze",
					);

					const meta = parseMeta(extractText(response));
					await bucket.put(`${obj.key}.meta.json`, JSON.stringify(meta, null, 2), {
						httpMetadata: { contentType: "application/json" },
					});

					try {
						await upsertMedia(env.DB, {
							bucket: name, key: obj.key, title: meta.title, description: meta.description,
							source: meta.source, contentType: ct, size: obj.size, uploadedAt: obj.uploaded.toISOString(),
						});
					} catch (dbErr) {
						console.error(`[cron] D1 index failed ${name}/${obj.key}:`, dbErr);
					}

					await logUsage(env.DB, { bucket: name, key: obj.key, action: "cron", model, success: true, latencyMs: Date.now() - start });
					processed++;
					console.log(`[cron] ✓ ${name}/${obj.key}`);
				} catch (err) {
					await logUsage(env.DB, {
						bucket: name, key: obj.key, action: "cron", model, success: false,
						errorMessage: err instanceof Error ? err.message : String(err), latencyMs: Date.now() - start,
					});
					failed++;
					console.error(`[cron] ✗ ${name}/${obj.key}:`, err);
				}
			}
		}
	}

	console.log(`[cron] Done — ${processed} analyzed, ${failed} failed, ${batchLimit - processed} remaining quota`);

	// Run maintenance (backfill + orphan count) after AI analysis
	try {
		await runMaintenance(env);
	} catch (err) {
		console.error("[cron] Maintenance failed:", err);
	}
}
