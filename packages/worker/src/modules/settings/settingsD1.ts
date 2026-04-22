import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";

const ALLOWED_NAMESPACES = ["ai.vision", "ai.tagger", "app", "maintenance"];

/** Validate namespace is alphanumeric with dots only */
function isValidNamespace(ns: string): boolean {
	return /^[a-z][a-z0-9.]*$/.test(ns) && !ns.includes("..");
}

/** Get all settings matching a namespace prefix (e.g. "ai.vision") */
export async function getSettings(
	db: D1Database,
	namespace: string,
): Promise<Record<string, string>> {
	const result = await db
		.prepare("SELECT key, value FROM settings WHERE key LIKE ?")
		.bind(`${namespace}.%`)
		.all<{ key: string; value: string }>();

	const out: Record<string, string> = {};
	const prefixLen = namespace.length + 1;
	for (const row of result.results) {
		out[row.key.slice(prefixLen)] = row.value;
	}
	return out;
}

/** Set a single namespaced setting */
export async function putSetting(
	db: D1Database,
	key: string,
	value: string,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
			 ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
		)
		.bind(key, value)
		.run();
}

/** Bulk-set settings for a namespace */
export async function putSettings(
	db: D1Database,
	namespace: string,
	values: Record<string, string>,
): Promise<void> {
	const stmts = Object.entries(values).map(([k, v]) =>
		db
			.prepare(
				`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
				 ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
			)
			.bind(`${namespace}.${k}`, v),
	);
	if (stmts.length) await db.batch(stmts);
}

export class GetSettingsRoute extends OpenAPIRoute {
	schema = {
		operationId: "get-settings",
		tags: ["Settings"],
		summary: "Get settings by namespace",
	};

	async handle(c: AppContext) {
		const namespace = c.req.param("namespace");
		if (!namespace || !isValidNamespace(namespace)) {
			return c.json({ error: "Invalid namespace" }, 400);
		}
		if (!ALLOWED_NAMESPACES.includes(namespace)) {
			return c.json({ error: "Unknown namespace" }, 404);
		}

		try {
			const data = await getSettings(c.env.DB, namespace);
			return c.json(data);
		} catch (err) {
			console.error("[settings] D1 read error:", err);
			return c.json({ error: "Failed to read settings" }, 500);
		}
	}
}

export class PutSettingsRoute extends OpenAPIRoute {
	schema = {
		operationId: "put-settings",
		tags: ["Settings"],
		summary: "Update settings by namespace",
	};

	async handle(c: AppContext) {
		const namespace = c.req.param("namespace");
		if (!namespace || !isValidNamespace(namespace)) {
			return c.json({ error: "Invalid namespace" }, 400);
		}
		if (!ALLOWED_NAMESPACES.includes(namespace)) {
			return c.json({ error: "Unknown namespace" }, 404);
		}

		try {
			const body = await c.req.json<Record<string, string>>();
			await putSettings(c.env.DB, namespace, body);
			return c.json({ ok: true });
		} catch (err) {
			console.error("[settings] D1 write error:", err);
			return c.json({ error: "Failed to save settings" }, 500);
		}
	}
}
