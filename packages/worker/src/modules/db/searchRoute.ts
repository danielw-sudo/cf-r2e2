import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { searchMedia } from "./queries";

export class SearchMedia extends OpenAPIRoute {
	schema = {
		operationId: "search-media",
		tags: ["Search"],
		summary: "Search media by title or description",
	};

	async handle(c: AppContext) {
		const q = c.req.query("q")?.trim() || "";
		const bucket = c.req.query("bucket") || undefined;
		const tag = c.req.query("tag") || undefined;
		const sort = c.req.query("sort") || "relevance";
		const limitStr = c.req.query("limit");
		const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 50, 200) : 50;

		// Need at least a query or a tag filter
		if (!q && !tag) return c.json({ results: [] });

		const results = await searchMedia(c.env.DB, q, limit, bucket, tag, sort);
		return c.json({ results });
	}
}
