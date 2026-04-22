import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { decodeBase64Key } from "../../foundation/encoding";
import { resolveBucket } from "../../foundation/buckets";
import { withTimeout } from "../../foundation/withTimeout";
import { IMAGE_EXTS, extractText, parseMeta, toDataUri, TagsSchema } from "./constants";
import { loadAiConfig, loadTaggerConfig } from "../settings/aiSettings";
import { upsertMedia } from "../db/queries";
import { listTags, attachTags } from "../db/tags";
import { logUsage } from "./usage";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const AI_TIMEOUT_MS = 60_000;

export class AnalyzeImage extends OpenAPIRoute {
	schema = { operationId: "analyze-image", tags: ["AI"], summary: "Analyze image with Workers AI" };

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
		if (obj.size > MAX_IMAGE_SIZE) return c.json({ error: "Image too large (max 10 MB)" }, 413);

		const buf = await obj.arrayBuffer();
		const bytes = new Uint8Array(buf);
		const aiConfig = await loadAiConfig(c.env);
		const model = aiConfig.model;
		const contentType = obj.httpMetadata?.contentType || "image/jpeg";
		const dataUri = toDataUri(bytes, contentType);

		console.log(`[analyze] model=${model} key=${key} bytes=${bytes.length}`);

		let text: string;
		const start = Date.now();
		try {
			const response = await withTimeout(
				c.env.AI.run(model as any, {
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
				"analyze",
			);
			text = extractText(response);
			await logUsage(c.env.DB, { bucket: bucketName, key, action: "analyze", model, success: true, latencyMs: Date.now() - start });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			await logUsage(c.env.DB, { bucket: bucketName, key, action: "analyze", model, success: false, errorMessage: msg, latencyMs: Date.now() - start });
			return c.json({ error: "AI analysis failed", detail: msg, model, bytes: bytes.length }, 502);
		}

		const meta = parseMeta(text);
		const sidecar = { ...meta, fileInfo: { uploaded: obj.uploaded.toISOString(), size: obj.size, contentType } };

		try {
			await bucket.put(`${key}.meta.json`, JSON.stringify(sidecar, null, 2), { httpMetadata: { contentType: "application/json" } });
		} catch (err) {
			console.error(`[analyze] Sidecar write failed for ${key}:`, err);
		}

		try {
			await upsertMedia(c.env.DB, {
				bucket: bucketName, key, title: meta.title, description: meta.description,
				source: meta.source, contentType, size: obj.size, uploadedAt: obj.uploaded.toISOString(),
			});
		} catch (err) {
			console.error(`[analyze] D1 index failed for ${key}:`, err);
		}

		// Auto-tag
		let tags: string[] = [];
		try {
			const taggerConfig = await loadTaggerConfig(c.env);
			const existingTags = await listTags(c.env.DB, 200);
			const tagList = existingTags.map((t) => t.name).join(", ") || "none yet";
			const tagPrompt = taggerConfig.prompt.replace("{{TAGS}}", tagList);

			const tagStart = Date.now();
			const tagResp = await withTimeout(
				c.env.AI.run(taggerConfig.model as any, {
					messages: [
						{ role: "system", content: tagPrompt },
						{ role: "user", content: [
							{ type: "image_url", image_url: { url: dataUri } },
							{ type: "text", text: "Tag this image." },
						] },
					],
					max_tokens: taggerConfig.maxTokens,
				} as any),
				AI_TIMEOUT_MS,
				"tag",
			);
			await logUsage(c.env.DB, { bucket: bucketName, key, action: "tag", model: taggerConfig.model, success: true, latencyMs: Date.now() - tagStart });

			const tagText = extractText(tagResp);
			const fenced = tagText.match(/```(?:json)?\s*([\s\S]*?)```/);
			const json = fenced ? fenced[1].trim() : tagText.match(/\{[\s\S]*\}/)?.[0] ?? tagText;
			tags = TagsSchema.parse(JSON.parse(json)).tags;

			const media = await c.env.DB.prepare("SELECT id FROM media WHERE bucket = ? AND key = ?").bind(bucketName, key).first<{ id: number }>();
			if (media && tags.length) await attachTags(c.env.DB, media.id, tags);
		} catch (err) {
			console.error(`[analyze] Auto-tag failed for ${key}:`, err);
		}

		return c.json({ key, meta: sidecar, tags, _debug: { model, bytes: bytes.length } });
	}
}
