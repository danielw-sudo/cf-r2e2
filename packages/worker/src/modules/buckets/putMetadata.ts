import { OpenAPIRoute } from "chanfana";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppContext } from "../../types";
import { decodeBase64Key } from "../../foundation/encoding";
import { resolveBucket } from "../../foundation/buckets";

export class PutMetadata extends OpenAPIRoute {
	schema = {
		operationId: "post-bucket-put-object-metadata",
		tags: ["Buckets"],
		summary: "Update object metadata",
		request: {
			params: z.object({
				bucket: z.string(),
				key: z.string().describe("base64 encoded file key"),
			}),
			body: {
				content: {
					"application/json": {
						schema: z
							.object({
								customMetadata: z.record(z.string(), z.any()),
								httpMetadata: z.record(z.string(), z.any()),
							})
							.openapi("Object metadata"),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const bucketName = data.params.bucket;
		const bucket = resolveBucket(c.env, bucketName);

		if (!bucket) {
			throw new HTTPException(500, {
				message: `Bucket binding not found: ${bucketName}`,
			});
		}

		const filePath = decodeBase64Key(data.params.key);

		const object = await bucket.get(filePath);

		if (object === null) {
			// Add this check
			throw new HTTPException(404, { message: "Object not found" });
		}

		// object.body is now safe to access
		return await bucket.put(filePath, object.body, {
			customMetadata: data.body.customMetadata,
			httpMetadata: data.body.httpMetadata,
		});
	}
}
