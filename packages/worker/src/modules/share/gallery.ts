import type { AppContext } from "../../types";
import { listPublicMedia } from "../db/queries";
import { publicShareUrl } from "../buckets/publicShare";

/** JSON API — list all public media */
export async function galleryApi(c: AppContext) {
	const items = await listPublicMedia(c.env.DB);
	const images = items.filter((m) => m.contentType?.startsWith("image/"));

	const gallery = await Promise.all(
		images.map(async (m) => ({
			url: await publicShareUrl(c.env, m.bucket, m.key),
			title: m.title || m.key.split("/").pop(),
			description: m.description,
			bucket: m.bucket,
		})),
	);

	c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
	return c.json({ items: gallery });
}
