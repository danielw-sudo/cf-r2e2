import { OpenAPIRoute } from "chanfana";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AppContext } from "../../types";
import { decodeBase64Key } from "../../foundation/encoding";
import { resolveBucket } from "../../foundation/buckets";

export class MoveObject extends OpenAPIRoute {
	schema = {
		operationId: "post-bucket-move-object",
		tags: ["Buckets"],
		summary: "Move object",
		request: {
			params: z.object({
				bucket: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							oldKey: z.string().describe("base64 encoded file key"),
							newKey: z.string().describe("base64 encoded file key"),
						}),
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

		const oldKey = decodeBase64Key(data.body.oldKey);
		const newKey = decodeBase64Key(data.body.newKey);

		const object = await bucket.get(oldKey);

		if (object === null) {
			throw new HTTPException(404, {
				message: `Source object not found: ${oldKey}`,
			});
		}

		const resp = await bucket.put(newKey, object.body, {
			customMetadata: object.customMetadata,
			httpMetadata: object.httpMetadata,
		});

		await bucket.delete(oldKey);

		return resp;
	}
}
