import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "../../../types";
import { decodeBase64Key } from "../../../foundation/encoding";
import { resolveBucket } from "../../../foundation/buckets";

export class PartUpload extends OpenAPIRoute {
	schema = {
		operationId: "post-multipart-part-upload",
		tags: ["Multipart"],
		summary: "Part upload",
		request: {
			body: {
				content: {
					"application/octet-stream": {
						schema: z.object({}).openapi({
							type: "string",
							format: "binary",
						}),
					},
				},
			},
			params: z.object({
				bucket: z.string(),
			}),
			query: z.object({
				key: z.string().describe("base64 encoded file key"),
				uploadId: z.string(),
				partNumber: z.number().int(),
			}),
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const bucket = resolveBucket(c.env, data.params.bucket);
		if (!bucket) throw new HTTPException(404, { message: "Bucket not found" });

		const key = decodeBase64Key(data.query.key);

		const multipartUpload = bucket.resumeMultipartUpload(
			key,
			data.query.uploadId,
		);

		try {
			return await multipartUpload.uploadPart(
				data.query.partNumber,
				c.req.raw.body,
			);
		} catch (error: any) {
			return new Response(error.message, { status: 400 });
		}
	}
}
