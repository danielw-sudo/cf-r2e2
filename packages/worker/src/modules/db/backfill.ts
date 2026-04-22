import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { isImage } from "../ai/constants";
import { upsertMedia } from "./queries";
import { getBuckets } from "../../foundation/buckets";

const BATCH_SIZE = 50;

export class BackfillMedia extends OpenAPIRoute {
	schema = {
		operationId: "backfill-media",
		tags: ["Admin"],
		summary: "Backfill D1 media index from existing sidecars",
	};

	async handle(c: AppContext) {
		const buckets = getBuckets(c.env);
		let processed = 0;
		let skipped = 0;
		let errors = 0;
		let hasMore = false;

		for (const { name, bucket } of buckets) {
			if (processed >= BATCH_SIZE) {
				hasMore = true;
				break;
			}

			let cursor: string | undefined;
			let truncated = true;

			while (truncated && processed < BATCH_SIZE) {
				const list = await bucket.list({ limit: 100, cursor });
				truncated = list.truncated;
				cursor = list.truncated ? list.cursor : undefined;

				for (const obj of list.objects) {
					if (processed >= BATCH_SIZE) {
						hasMore = truncated || buckets.indexOf({ name, bucket }) < buckets.length - 1;
						break;
					}
					if (!obj.key.endsWith(".meta.json")) continue;

					const imageKey = obj.key.replace(/\.meta\.json$/, "");
					if (!isImage(imageKey)) {
						skipped++;
						continue;
					}

					try {
						const metaObj = await bucket.get(obj.key);
						if (!metaObj) continue;

						const meta = await metaObj.json<Record<string, unknown>>();
						const imageHead = await bucket.head(imageKey);

						await upsertMedia(c.env.DB, {
							bucket: name,
							key: imageKey,
							title: (meta.title as string) || undefined,
							description: (meta.description as string) || undefined,
							source: (meta.source as string) || undefined,
							contentType: imageHead?.httpMetadata?.contentType || "unknown",
							size: imageHead?.size,
							uploadedAt: imageHead?.uploaded?.toISOString(),
						});
						processed++;
					} catch (err) {
						errors++;
						console.error(`[backfill] Error ${name}/${obj.key}:`, err);
					}
				}
			}

			if (truncated) hasMore = true;
		}

		return c.json({ processed, skipped, errors, hasMore });
	}
}
