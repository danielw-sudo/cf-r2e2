export interface UsageEntry {
	bucket: string;
	key: string;
	action: "analyze" | "tag" | "cron";
	model: string;
	success: boolean;
	errorMessage?: string;
	latencyMs?: number;
}

export interface UsageSummary {
	totalCalls: number;
	successCount: number;
	failCount: number;
	byModel: Record<string, number>;
	byAction: Record<string, number>;
	byDay: { date: string; count: number }[];
}

/** Insert a usage record. Swallows errors to never break the caller. */
export async function logUsage(db: D1Database, entry: UsageEntry): Promise<void> {
	try {
		await db
			.prepare(
				`INSERT INTO ai_usage (bucket, key, action, model, success, error_message, latency_ms)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				entry.bucket,
				entry.key,
				entry.action,
				entry.model,
				entry.success ? 1 : 0,
				entry.errorMessage ?? null,
				entry.latencyMs ?? null,
			)
			.run();
	} catch (err) {
		console.warn("[usage] Failed to log:", err);
	}
}

/** Get usage summary for the last N days */
export async function getUsageSummary(db: D1Database, days = 7): Promise<UsageSummary> {
	const modifier = `-${days} days`;

	const [totals, models, actions, daily] = await db.batch([
		db.prepare(
			`SELECT COUNT(*) as total, SUM(success) as ok, COUNT(*)-SUM(success) as fail
			 FROM ai_usage WHERE created_at >= datetime('now', ?)`,
		).bind(modifier),
		db.prepare(
			`SELECT model, COUNT(*) as cnt FROM ai_usage WHERE created_at >= datetime('now', ?) GROUP BY model ORDER BY cnt DESC`,
		).bind(modifier),
		db.prepare(
			`SELECT action, COUNT(*) as cnt FROM ai_usage WHERE created_at >= datetime('now', ?) GROUP BY action ORDER BY cnt DESC`,
		).bind(modifier),
		db.prepare(
			`SELECT DATE(created_at) as date, COUNT(*) as cnt FROM ai_usage WHERE created_at >= datetime('now', ?) GROUP BY DATE(created_at) ORDER BY date`,
		).bind(modifier),
	]);

	const t = totals.results[0] as any;
	const byModel: Record<string, number> = {};
	for (const r of models.results as any[]) byModel[r.model] = r.cnt;
	const byAction: Record<string, number> = {};
	for (const r of actions.results as any[]) byAction[r.action] = r.cnt;
	const byDay = (daily.results as any[]).map((r) => ({ date: r.date, count: r.cnt }));

	return {
		totalCalls: t?.total ?? 0,
		successCount: t?.ok ?? 0,
		failCount: t?.fail ?? 0,
		byModel,
		byAction,
		byDay,
	};
}

/** Get recent usage entries */
export async function getRecentUsage(db: D1Database, limit = 20) {
	const result = await db
		.prepare("SELECT * FROM ai_usage ORDER BY created_at DESC LIMIT ?")
		.bind(limit)
		.all();
	return result.results;
}
