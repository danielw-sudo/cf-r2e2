import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { decodeBase64Key } from "../../foundation/encoding";
import { listTags, createTag, attachTags, detachTags, getTagsByKey, renameTag, deleteTag, mergeTags } from "./tags";

const MAX_TAG_LEN = 50;
const MAX_TAGS_PER_REQUEST = 32;

function tryDecodeKey(raw: string): string | null {
	try { return decodeBase64Key(raw); } catch { return null; }
}

function validateTagName(name: unknown): string | null {
	if (typeof name !== "string") return null;
	const trimmed = name.trim();
	if (!trimmed || trimmed.length > MAX_TAG_LEN) return null;
	return trimmed;
}

function validateTagList(raw: unknown): string[] | null {
	if (!Array.isArray(raw) || !raw.length || raw.length > MAX_TAGS_PER_REQUEST) return null;
	const out: string[] = [];
	for (const n of raw) {
		const v = validateTagName(n);
		if (!v) return null;
		out.push(v);
	}
	return out;
}

export class ListTagsRoute extends OpenAPIRoute {
	schema = { operationId: "list-tags", tags: ["Tags"], summary: "List all tags" };

	async handle(c: AppContext) {
		const tags = await listTags(c.env.DB);
		return c.json(tags);
	}
}

export class CreateTagRoute extends OpenAPIRoute {
	schema = { operationId: "create-tag", tags: ["Tags"], summary: "Create a tag" };

	async handle(c: AppContext) {
		const { name } = await c.req.json<{ name: string }>();
		const valid = validateTagName(name);
		if (!valid) return c.json({ error: `Name required (max ${MAX_TAG_LEN} chars)` }, 400);
		const tag = await createTag(c.env.DB, valid);
		return c.json(tag);
	}
}

export class GetMediaTagsRoute extends OpenAPIRoute {
	schema = { operationId: "get-media-tags", tags: ["Tags"], summary: "Get tags for a file" };

	async handle(c: AppContext) {
		const bucket = c.req.param("bucket");
		const key = tryDecodeKey(c.req.param("key"));
		if (!key) return c.json({ error: "Invalid key encoding" }, 400);
		const tags = await getTagsByKey(c.env.DB, bucket, key);
		return c.json(tags);
	}
}

export class AttachTagsRoute extends OpenAPIRoute {
	schema = { operationId: "attach-tags", tags: ["Tags"], summary: "Attach tags to a file" };

	async handle(c: AppContext) {
		const bucket = c.req.param("bucket");
		const key = tryDecodeKey(c.req.param("key"));
		if (!key) return c.json({ error: "Invalid key encoding" }, 400);

		const { tags: tagNames } = await c.req.json<{ tags: string[] }>();
		const valid = validateTagList(tagNames);
		if (!valid) return c.json({ error: `1-${MAX_TAGS_PER_REQUEST} tags required, each <= ${MAX_TAG_LEN} chars` }, 400);

		const media = await c.env.DB
			.prepare("SELECT id FROM media WHERE bucket = ? AND key = ?")
			.bind(bucket, key)
			.first<{ id: number }>();
		if (!media) return c.json({ error: "Media not indexed" }, 404);

		const attached = await attachTags(c.env.DB, media.id, valid);
		return c.json({ tags: attached });
	}
}

export class RenameTagRoute extends OpenAPIRoute {
	schema = { operationId: "rename-tag", tags: ["Tags"], summary: "Rename a tag" };

	async handle(c: AppContext) {
		const slug = c.req.param("slug");
		const { name } = await c.req.json<{ name: string }>();
		const valid = validateTagName(name);
		if (!valid) return c.json({ error: `Name required (max ${MAX_TAG_LEN} chars)` }, 400);
		const tag = await renameTag(c.env.DB, slug, valid);
		if (!tag) return c.json({ error: "Tag not found or slug conflict" }, 409);
		return c.json(tag);
	}
}

export class DeleteTagRoute extends OpenAPIRoute {
	schema = { operationId: "delete-tag", tags: ["Tags"], summary: "Delete a tag" };

	async handle(c: AppContext) {
		const slug = c.req.param("slug");
		const ok = await deleteTag(c.env.DB, slug);
		if (!ok) return c.json({ error: "Tag not found" }, 404);
		return c.json({ ok: true });
	}
}

export class MergeTagsRoute extends OpenAPIRoute {
	schema = { operationId: "merge-tags", tags: ["Tags"], summary: "Merge two tags" };

	async handle(c: AppContext) {
		const { source, target } = await c.req.json<{ source: string; target: string }>();
		if (!source || !target) return c.json({ error: "source and target slugs required" }, 400);
		if (source === target) return c.json({ error: "Cannot merge a tag into itself" }, 400);
		const ok = await mergeTags(c.env.DB, source, target);
		if (!ok) return c.json({ error: "Source or target tag not found" }, 404);
		return c.json({ ok: true });
	}
}

export class DetachTagsRoute extends OpenAPIRoute {
	schema = { operationId: "detach-tags", tags: ["Tags"], summary: "Remove tags from a file" };

	async handle(c: AppContext) {
		const bucket = c.req.param("bucket");
		const key = tryDecodeKey(c.req.param("key"));
		if (!key) return c.json({ error: "Invalid key encoding" }, 400);

		const { tags: tagNames } = await c.req.json<{ tags: string[] }>();
		const valid = validateTagList(tagNames);
		if (!valid) return c.json({ error: `1-${MAX_TAGS_PER_REQUEST} tags required, each <= ${MAX_TAG_LEN} chars` }, 400);

		const media = await c.env.DB
			.prepare("SELECT id FROM media WHERE bucket = ? AND key = ?")
			.bind(bucket, key)
			.first<{ id: number }>();
		if (!media) return c.json({ error: "Media not indexed" }, 404);

		await detachTags(c.env.DB, media.id, valid);
		return c.json({ ok: true });
	}
}
