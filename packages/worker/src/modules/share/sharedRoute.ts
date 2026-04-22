import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { listPublicMedia } from "../db/queries";
import { publicShareUrl } from "../buckets/publicShare";

/** Authenticated — list all publicly shared assets with signed URLs + raw
 *  bucket/key so the dashboard can render a revoke button. */
export class ListShared extends OpenAPIRoute {
	schema = {
		operationId: "list-shared",
		tags: ["Share"],
		summary: "List all publicly shared assets",
	};

	async handle(c: AppContext) {
		const items = await listPublicMedia(c.env.DB, 500);
		const enriched = await Promise.all(
			items.map(async (m) => ({
				bucket: m.bucket,
				key: m.key,
				title: m.title,
				description: m.description,
				contentType: m.contentType,
				size: m.size,
				uploadedAt: m.uploadedAt,
				url: await publicShareUrl(c.env, m.bucket, m.key),
			})),
		);
		return c.json({ items: enriched });
	}
}
