import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { decodeBase64Key } from "../../foundation/encoding";
import { resolveBucket } from "../../foundation/buckets";
import { signShareKey, verifyShareToken } from "../../foundation/signing";

/** Build a signed public-share URL for `${bucket}/${key}`. */
export async function publicShareUrl(env: AppContext["env"], bucket: string, key: string): Promise<string> {
	const token = await signShareKey(env, bucket, key);
	return `https://${env.SHARE_DOMAIN}/share/p/${bucket}/${encodeURIComponent(token)}`;
}

/** Unauthenticated — serves objects with `public: true` in sidecar, gated by HMAC token. */
export async function servePublic(c: AppContext) {
	const bucketName = c.req.param("bucket");
	const token = decodeURIComponent(c.req.param("token"));

	const bucket = resolveBucket(c.env, bucketName);
	if (!bucket) return c.json({ error: "Not found" }, 404);

	const key = await verifyShareToken(c.env, bucketName, token);
	if (!key) return c.json({ error: "Not found" }, 404);

	const sidecar = await bucket.get(`${key}.meta.json`);
	if (!sidecar) return c.json({ error: "Not found" }, 404);

	let meta: Record<string, unknown>;
	try { meta = await sidecar.json(); } catch { return c.json({ error: "Not found" }, 404); }

	if (!meta.public) return c.json({ error: "Not found" }, 404);

	const obj = await bucket.get(key);
	if (!obj) return c.json({ error: "Not found" }, 404);

	return new Response(obj.body, {
		headers: {
			"Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
			"Content-Disposition": `inline; filename="${key.split("/").pop()}"`,
			"Cache-Control": "public, max-age=86400",
		},
	});
}

/** Toggle the `public` flag in a sidecar .meta.json */
export class TogglePublic extends OpenAPIRoute {
	schema = {
		operationId: "toggle-public",
		tags: ["Buckets"],
		summary: "Toggle public sharing for an object",
	};

	async handle(c: AppContext) {
		const bucketName = c.req.param("bucket");
		const rawKey = c.req.param("key");
		let key: string;
		try { key = decodeBase64Key(rawKey); } catch { return c.json({ error: "Invalid key encoding" }, 400); }
		const bucket = resolveBucket(c.env, bucketName);

		if (!bucket) return c.json({ error: "Bucket not found" }, 404);

		const head = await bucket.head(key);
		if (!head) return c.json({ error: "Object not found" }, 404);

		const sidecarKey = `${key}.meta.json`;
		let meta: Record<string, unknown> = {};
		const existing = await bucket.get(sidecarKey);
		if (existing) {
			try { meta = await existing.json(); } catch { /* fresh sidecar */ }
		}

		meta.public = !meta.public;
		await bucket.put(sidecarKey, JSON.stringify(meta, null, 2), {
			httpMetadata: { contentType: "application/json" },
		});

		// Sync public flag to D1 for gallery queries
		await c.env.DB.prepare("UPDATE media SET public = ? WHERE bucket = ? AND key = ?")
			.bind(meta.public ? 1 : 0, bucketName, key).run();

		const url = meta.public ? await publicShareUrl(c.env, bucketName, key) : null;
		return c.json({ public: meta.public, url });
	}
}
