import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "../../../types";
import { decodeBase64Key } from "../../../foundation/encoding";
import { resolveBucket } from "../../../foundation/buckets";

export class CreateUpload extends OpenAPIRoute {
	schema = {
		operationId: "post-multipart-create-upload",
		tags: ["Multipart"],
		summary: "Create upload",
		request: {
			params: z.object({
				bucket: z.string(),
			}),
			query: z.object({
				key: z.string().describe("base64 encoded file key"),
				customMetadata: z
					.string()
					.nullable()
					.optional()
					.describe("base64 encoded json string"),
				httpMetadata: z
					.string()
					.nullable()
					.optional()
					.describe("base64 encoded json string"),
			}),
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const bucket = resolveBucket(c.env, data.params.bucket);
		if (!bucket) throw new HTTPException(404, { message: "Bucket not found" });

		const key = decodeBase64Key(data.query.key);

		let customMetadata = undefined;
		if (data.query.customMetadata) {
			customMetadata = JSON.parse(decodeBase64Key(data.query.customMetadata));
		}

		let httpMetadata = undefined;
		if (data.query.httpMetadata) {
			httpMetadata = JSON.parse(decodeBase64Key(data.query.httpMetadata));
		}

		return await bucket.createMultipartUpload(key, {
			customMetadata: customMetadata,
			httpMetadata: httpMetadata,
		});
	}
}
