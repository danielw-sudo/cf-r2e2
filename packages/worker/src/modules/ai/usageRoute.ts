import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { getUsageSummary, getRecentUsage } from "./usage";

export class GetUsageSummary extends OpenAPIRoute {
	schema = { operationId: "get-usage-summary", tags: ["AI"], summary: "Get AI usage summary" };

	async handle(c: AppContext) {
		const days = Math.min(Number(c.req.query("days")) || 7, 90);
		const summary = await getUsageSummary(c.env.DB, days);
		return c.json(summary);
	}
}

export class GetRecentUsage extends OpenAPIRoute {
	schema = { operationId: "get-recent-usage", tags: ["AI"], summary: "Get recent AI usage entries" };

	async handle(c: AppContext) {
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const entries = await getRecentUsage(c.env.DB, limit);
		return c.json({ entries });
	}
}
