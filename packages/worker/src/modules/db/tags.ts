/** Slugify a tag name for deduplication */
export function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export interface Tag {
	id: number;
	name: string;
	slug: string;
	usage_count: number;
}

/** List all tags ordered by usage */
export async function listTags(db: D1Database, limit = 200): Promise<Tag[]> {
	const result = await db
		.prepare("SELECT * FROM tags ORDER BY usage_count DESC LIMIT ?")
		.bind(limit)
		.all<Tag>();
	return result.results;
}

/** Create a tag (or return existing by slug) */
export async function createTag(db: D1Database, name: string): Promise<Tag> {
	const slug = slugify(name);
	await db
		.prepare(
			`INSERT INTO tags (name, slug) VALUES (?, ?)
			 ON CONFLICT(slug) DO NOTHING`,
		)
		.bind(name.trim(), slug)
		.run();
	const tag = await db
		.prepare("SELECT * FROM tags WHERE slug = ?")
		.bind(slug)
		.first<Tag>();
	if (!tag) throw new Error(`Failed to create tag: ${name}`);
	return tag;
}

/** Attach tags to a media entry, creating tags if needed (batched) */
export async function attachTags(
	db: D1Database,
	mediaId: number,
	tagNames: string[],
): Promise<Tag[]> {
	const unique = Array.from(new Set(tagNames.map((n) => n.trim()).filter(Boolean)));
	if (!unique.length) return [];
	const slugs = unique.map(slugify).filter(Boolean);
	if (!slugs.length) return [];

	// Batch create all missing tags
	await db.batch(
		unique.map((name, i) =>
			db.prepare("INSERT INTO tags (name, slug) VALUES (?, ?) ON CONFLICT(slug) DO NOTHING")
				.bind(name, slugs[i]),
		),
	);

	const placeholders = slugs.map(() => "?").join(",");
	const tags = (
		await db.prepare(`SELECT * FROM tags WHERE slug IN (${placeholders})`)
			.bind(...slugs)
			.all<Tag>()
	).results;
	if (!tags.length) return [];

	// Batch insert joins, then reconcile usage_count by actual join count.
	// This avoids racing UPDATEs and keeps the counter self-healing.
	const inserts = tags.map((t) =>
		db.prepare("INSERT INTO media_tags (media_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
			.bind(mediaId, t.id),
	);
	const recounts = tags.map((t) =>
		db.prepare(
			"UPDATE tags SET usage_count = (SELECT COUNT(*) FROM media_tags WHERE tag_id = ?) WHERE id = ?",
		).bind(t.id, t.id),
	);
	await db.batch([...inserts, ...recounts]);
	return tags;
}

/** Get tags for a media entry */
export async function getTagsForMedia(
	db: D1Database,
	mediaId: number,
): Promise<Tag[]> {
	const result = await db
		.prepare(
			`SELECT t.* FROM tags t
			 JOIN media_tags mt ON mt.tag_id = t.id
			 WHERE mt.media_id = ?
			 ORDER BY t.name`,
		)
		.bind(mediaId)
		.all<Tag>();
	return result.results;
}

/** Get tags for a media entry by bucket+key */
export async function getTagsByKey(
	db: D1Database,
	bucket: string,
	key: string,
): Promise<Tag[]> {
	const media = await db
		.prepare("SELECT id FROM media WHERE bucket = ? AND key = ?")
		.bind(bucket, key)
		.first<{ id: number }>();
	if (!media) return [];
	return getTagsForMedia(db, media.id);
}

/** Rename a tag */
export async function renameTag(
	db: D1Database,
	oldSlug: string,
	newName: string,
): Promise<Tag | null> {
	const newSlug = slugify(newName);
	const existing = await db
		.prepare("SELECT id FROM tags WHERE slug = ? AND slug != ?")
		.bind(newSlug, oldSlug)
		.first<{ id: number }>();
	if (existing) return null; // conflict
	await db
		.prepare("UPDATE tags SET name = ?, slug = ? WHERE slug = ?")
		.bind(newName.trim(), newSlug, oldSlug)
		.run();
	return db.prepare("SELECT * FROM tags WHERE slug = ?").bind(newSlug).first<Tag>();
}

/** Delete a tag and cascade media_tags (batched for atomicity) */
export async function deleteTag(db: D1Database, slug: string): Promise<boolean> {
	const tag = await db
		.prepare("SELECT id FROM tags WHERE slug = ?")
		.bind(slug)
		.first<{ id: number }>();
	if (!tag) return false;
	await db.batch([
		db.prepare("DELETE FROM media_tags WHERE tag_id = ?").bind(tag.id),
		db.prepare("DELETE FROM tags WHERE id = ?").bind(tag.id),
	]);
	return true;
}

/** Merge source tag into target tag */
export async function mergeTags(
	db: D1Database,
	sourceSlug: string,
	targetSlug: string,
): Promise<boolean> {
	const source = await db.prepare("SELECT id FROM tags WHERE slug = ?").bind(sourceSlug).first<{ id: number }>();
	const target = await db.prepare("SELECT id FROM tags WHERE slug = ?").bind(targetSlug).first<{ id: number }>();
	if (!source || !target) return false;
	// Re-point media_tags, ignore conflicts (already tagged with target)
	await db.prepare("UPDATE OR IGNORE media_tags SET tag_id = ? WHERE tag_id = ?").bind(target.id, source.id).run();
	// Clean up remaining source rows (conflicts) + delete source tag + recount target
	const count = await db.prepare("SELECT COUNT(*) as c FROM media_tags WHERE tag_id = ?").bind(target.id).first<{ c: number }>();
	await db.batch([
		db.prepare("DELETE FROM media_tags WHERE tag_id = ?").bind(source.id),
		db.prepare("UPDATE tags SET usage_count = ? WHERE id = ?").bind((count?.c ?? 0) + 0, target.id),
		db.prepare("DELETE FROM tags WHERE id = ?").bind(source.id),
	]);
	return true;
}

/** Detach specific tags from a media entry (batched) */
export async function detachTags(
	db: D1Database,
	mediaId: number,
	tagNames: string[],
): Promise<void> {
	const slugs = Array.from(new Set(tagNames.map(slugify).filter(Boolean)));
	if (!slugs.length) return;
	const placeholders = slugs.map(() => "?").join(",");
	const tags = (
		await db.prepare(`SELECT id FROM tags WHERE slug IN (${placeholders})`)
			.bind(...slugs)
			.all<{ id: number }>()
	).results;
	if (!tags.length) return;

	const ids = tags.map((t) => t.id);
	const idPlaceholders = ids.map(() => "?").join(",");
	await db.batch([
		db.prepare(
			`DELETE FROM media_tags WHERE media_id = ? AND tag_id IN (${idPlaceholders})`,
		).bind(mediaId, ...ids),
		...ids.map((id) =>
			db.prepare(
				"UPDATE tags SET usage_count = (SELECT COUNT(*) FROM media_tags WHERE tag_id = ?) WHERE id = ?",
			).bind(id, id),
		),
	]);
}
