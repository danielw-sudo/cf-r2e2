import { OpenAPIRoute } from "chanfana";
import type { AppContext, AppEnv } from "../../types";
import {
	DEFAULT_MODEL,
	DEFAULT_MAX_TOKENS,
	DEFAULT_TAGGER_MAX_TOKENS,
	SYSTEM_PROMPT,
	TAGGER_PROMPT,
	VISION_MODELS,
} from "../ai/constants";
import { getSettings, putSettings } from "./settingsD1";

const CONFIG_KEY = "_r2e2/config.json";

export interface AiConfig {
	model: string;
	prompt: string;
	maxTokens: number;
}

/** Find the first R2 bucket binding in env */
function getConfigBucket(env: AppEnv): R2Bucket | null {
	for (const value of Object.values(env)) {
		if (value && typeof value === "object" && "get" in value && "put" in value && typeof value.get === "function") {
			return value as R2Bucket;
		}
	}
	return null;
}

/** Load from R2 (legacy fallback) */
async function loadFromR2(env: AppEnv): Promise<Partial<AiConfig> | null> {
	const bucket = getConfigBucket(env);
	if (!bucket) return null;
	try {
		const obj = await bucket.get(CONFIG_KEY);
		if (!obj) return null;
		return await obj.json<Partial<AiConfig>>();
	} catch {
		return null;
	}
}

/** Load AI config for a namespace: D1 first → R2 fallback (vision only) → defaults */
export async function loadAiConfig(env: AppEnv, namespace = "ai.vision"): Promise<AiConfig> {
	const isVision = namespace === "ai.vision";
	const defModel = DEFAULT_MODEL;
	const defPrompt = isVision ? SYSTEM_PROMPT : TAGGER_PROMPT;
	const defTokens = isVision ? DEFAULT_MAX_TOKENS : DEFAULT_TAGGER_MAX_TOKENS;

	try {
		const d1 = await getSettings(env.DB, namespace);
		if (d1.model || d1.prompt) {
			return {
				model: d1.model || defModel,
				prompt: d1.prompt || defPrompt,
				maxTokens: d1.max_tokens ? Number(d1.max_tokens) : defTokens,
			};
		}
	} catch {
		console.warn(`[ai-settings] D1 read failed for ${namespace}`);
	}

	// R2 fallback only for vision namespace
	if (isVision) {
		const r2 = await loadFromR2(env);
		if (r2?.model || r2?.prompt) {
			return { model: r2.model || defModel, prompt: r2.prompt || defPrompt, maxTokens: defTokens };
		}
	}

	return { model: defModel, prompt: defPrompt, maxTokens: defTokens };
}

/** Shorthand for tagger config */
export async function loadTaggerConfig(env: AppEnv): Promise<AiConfig> {
	return loadAiConfig(env, "ai.tagger");
}

export class GetAiSettings extends OpenAPIRoute {
	schema = { operationId: "get-ai-settings", tags: ["Settings"], summary: "Get AI configuration" };

	async handle(c: AppContext) {
		const ns = c.req.query("namespace") || "ai.vision";
		const isVision = ns === "ai.vision";
		const config = await loadAiConfig(c.env, ns);

		return c.json({
			model: config.model,
			prompt: config.prompt,
			maxTokens: config.maxTokens,
			defaultModel: DEFAULT_MODEL,
			defaultPrompt: isVision ? SYSTEM_PROMPT : TAGGER_PROMPT,
			defaultMaxTokens: isVision ? DEFAULT_MAX_TOKENS : DEFAULT_TAGGER_MAX_TOKENS,
			models: VISION_MODELS,
		});
	}
}

export class PutAiSettings extends OpenAPIRoute {
	schema = { operationId: "put-ai-settings", tags: ["Settings"], summary: "Update AI configuration" };

	async handle(c: AppContext) {
		const body = await c.req.json<{ model?: string; prompt?: string; maxTokens?: number; namespace?: string }>();
		const ns = body.namespace || "ai.vision";
		const current = await loadAiConfig(c.env, ns);

		const updated = {
			model: body.model || current.model,
			prompt: body.prompt || current.prompt,
			max_tokens: String(body.maxTokens ?? current.maxTokens),
		};

		try {
			await putSettings(c.env.DB, ns, updated);
		} catch (err) {
			console.error("[ai-settings] D1 write failed:", err);
			return c.json({ error: "Failed to save settings" }, 500);
		}

		// R2 backward compat — vision only
		if (ns === "ai.vision") {
			const bucket = getConfigBucket(c.env);
			if (bucket) {
				try {
					await bucket.put(CONFIG_KEY, JSON.stringify({ model: updated.model, prompt: updated.prompt }, null, 2), {
						httpMetadata: { contentType: "application/json" },
					});
				} catch {}
			}
		}

		return c.json({ model: updated.model, prompt: updated.prompt, maxTokens: Number(updated.max_tokens) });
	}
}
