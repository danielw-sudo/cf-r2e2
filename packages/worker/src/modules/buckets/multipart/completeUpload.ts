import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { AppContext } from "../../../types";
import { decodeBase64Key } from "../../../foundation/encoding";
import { resolveBucket } from "../../../foundation/buckets";

export class CompleteUpload extends OpenAPIRoute {
	schema = {
		operationId: "post-multipart-complete-upload",
		tags: ["Multipart"],
		summary: "Complete upload",
		request: {
			params: z.object({
				bucket: z.string(),
			}),
			body: {
				content: {
					"application/json": {
						schema: z.object({
							uploadId: z.string(),
							parts: z
								.object({
									etag: z.string(),
									partNumber: z.number().int(),
								})
								.array(),
							key: z.string().describe("base64 encoded file key"),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const bucket = resolveBucket(c.env, data.params.bucket);
		if (!bucket) throw new HTTPException(404, { message: "Bucket not found" });

		const uploadId = data.body.uploadId;
		const key = decodeBase64Key(data.body.key);
		const parts = data.body.parts;

		const multipartUpload = await bucket.resumeMultipartUpload(key, uploadId);

		try {
			const resp = await multipartUpload.complete(parts as R2UploadedPart[]);

			return {
				success: true,
				str: resp,
			};
		} catch (error: any) {
			return Response.json({ msg: error.message }, { status: 400 });
		}
	}
}
