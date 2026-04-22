import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { decodeBase64Key } from "../../foundation/encoding";
import { resolveBucket } from "../../foundation/buckets";
import { signPayload, verifyPayload } from "../../foundation/signing";

const EXPIRY_SECONDS = 86400; // 24 hours

interface PresignPayload {
	key: string;
	exp: number;
}

export class PresignObject extends OpenAPIRoute {
	schema = {
		operationId: "presign-object",
		tags: ["Buckets"],
		summary: "Generate a presigned URL for an object (24h)",
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

		const exp = Date.now() + EXPIRY_SECONDS * 1000;
		const token = await signPayload(c.env, bucketName, { key, exp });

		const shareDomain = c.env.SHARE_DOMAIN;
		const url = `https://${shareDomain}/share/t/${bucketName}/${encodeURIComponent(token)}`;
		return c.json({ url, expiresAt: new Date(exp).toISOString() });
	}
}

/** Plain Hono handler — registered outside /api/* to bypass Zero Trust */
export async function servePresigned(c: AppContext) {
	const bucketName = c.req.param("bucket");
	const token = decodeURIComponent(c.req.param("token"));

	const bucket = resolveBucket(c.env, bucketName);
	if (!bucket) return c.json({ error: "Not found" }, 404);

	const payload = await verifyPayload<PresignPayload>(c.env, bucketName, token);
	if (!payload) return c.json({ error: "Invalid token" }, 403);
	if (Date.now() > payload.exp) return c.json({ error: "URL expired" }, 410);

	const obj = await bucket.get(payload.key);
	if (!obj) return c.json({ error: "Object not found" }, 404);

	return new Response(obj.body, {
		headers: {
			"Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
			"Content-Disposition": `inline; filename="${payload.key.split("/").pop()}"`,
			"Cache-Control": "private, max-age=3600",
		},
	});
}
