import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { decodeBase64Key } from "../../foundation/encoding";
import { resolveBucket } from "../../foundation/buckets";
import { withTimeout } from "../../foundation/withTimeout";
import { IMAGE_EXTS, TagsSchema, extractText, toDataUri } from "./constants";
import { loadTaggerConfig } from "../settings/aiSettings";
import { listTags, attachTags } from "../db/tags";
import { logUsage } from "./usage";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const AI_TIMEOUT_MS = 60_000;

/** Extract JSON and parse tags from AI response */
function parseTags(text: string): string[] {
	try {
		const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		const json = fenced ? fenced[1].trim() : text.match(/\{[\s\S]*\}/)?.[0] ?? text;
		return TagsSchema.parse(JSON.parse(json)).tags;
	} catch {
		return [];
	}
}

export class TagImage extends OpenAPIRoute {
	schema = { operationId: "tag-image", tags: ["AI"], summary: "Auto-tag an image with Workers AI" };

	async handle(c: AppContext) {
		const bucketName = c.req.param("bucket");
		const rawKey = c.req.param("key");

		let key: string;
		try {
			key = decodeBase64Key(rawKey);
		} catch {
			return c.json({ error: "Invalid key encoding" }, 400);
		}

		const bucket = resolveBucket(c.env, bucketName);
		if (!bucket) return c.json({ error: "Bucket not found" }, 404);

		const ext = key.split(".").pop()?.toLowerCase() ?? "";
		if (!IMAGE_EXTS.includes(ext)) return c.json({ error: "Not an image" }, 400);

		const obj = await bucket.get(key);
		if (!obj) return c.json({ error: "Object not found" }, 404);
		if (obj.size > MAX_IMAGE_SIZE) return c.json({ error: "Image too large" }, 413);

		const buf = await obj.arrayBuffer();
		const bytes = new Uint8Array(buf);
		const aiConfig = await loadTaggerConfig(c.env);
		const model = aiConfig.model;
		const contentType = obj.httpMetadata?.contentType || "image/jpeg";
		const dataUri = toDataUri(bytes, contentType);

		const existingTags = await listTags(c.env.DB, 200);
		const tagList = existingTags.map((t) => t.name).join(", ") || "none yet";
		const prompt = aiConfig.prompt.replace("{{TAGS}}", tagList);

		let tags: string[];
		const start = Date.now();
		try {
			const response = await withTimeout(
				c.env.AI.run(model as any, {
					messages: [
						{ role: "system", content: prompt },
						{ role: "user", content: [
							{ type: "image_url", image_url: { url: dataUri } },
							{ type: "text", text: "Tag this image." },
						] },
					],
					max_tokens: aiConfig.maxTokens,
				} as any),
				AI_TIMEOUT_MS,
				"tag",
			);
			tags = parseTags(extractText(response));
			await logUsage(c.env.DB, { bucket: bucketName, key, action: "tag", model, success: true, latencyMs: Date.now() - start });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			await logUsage(c.env.DB, { bucket: bucketName, key, action: "tag", model, success: false, errorMessage: msg, latencyMs: Date.now() - start });
			return c.json({ error: "Tagging failed", detail: msg }, 502);
		}

		if (tags.length === 0) return c.json({ key, tags: [], attached: false });

		const media = await c.env.DB
			.prepare("SELECT id FROM media WHERE bucket = ? AND key = ?")
			.bind(bucketName, key)
			.first<{ id: number }>();

		if (media) await attachTags(c.env.DB, media.id, tags);

		return c.json({ key, tags, attached: !!media });
	}
}
