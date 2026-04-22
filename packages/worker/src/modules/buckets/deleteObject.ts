import { OpenAPIRoute } from "chanfana";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppContext } from "../../types";
import { decodeBase64Key } from "../../foundation/encoding";
import { resolveBucket } from "../../foundation/buckets";

export class DeleteObject extends OpenAPIRoute {
	schema = {
		operationId: "post-bucket-delete-object",
		tags: ["Buckets"],
		summary: "Delete object",
		request: {
			params: z.object({
				bucket: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							key: z.string().describe("base64 encoded file key"),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const bucketName = data.params.bucket; // Store bucket name
		const bucket = resolveBucket(c.env, bucketName);

		if (!bucket) {
			// Using Hono's HTTPException for proper error response
			throw new HTTPException(500, {
				message: `Bucket binding not found: ${bucketName}`,
			});
		}

		const key = decodeBase64Key(data.body.key);

		await bucket.delete(key);

		// Also delete AI sidecar metadata if it exists
		const sidecarKey = `${key}.meta.json`;
		try {
			await bucket.delete(sidecarKey);
		} catch {
			// Sidecar may not exist — that's fine
		}

		return { success: true };
	}
}
