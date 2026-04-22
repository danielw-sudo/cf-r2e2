export interface MediaEntry {
	bucket: string;
	key: string;
	title?: string;
	description?: string;
	source?: string;
	contentType?: string;
	size?: number;
	uploadedAt?: string;
	public?: boolean;
}

/** D1 row shape (snake_case columns) */
interface MediaRow {
	id: number;
	bucket: string;
	key: string;
	title: string | null;
	description: string | null;
	source: string | null;
	content_type: string | null;
	size: number | null;
	uploaded_at: string | null;
	indexed_at: string;
	public: number | null;
}

/** Convert D1 row to MediaEntry */
function rowToEntry(row: MediaRow): MediaEntry {
	return {
		bucket: row.bucket,
		key: row.key,
		title: row.title ?? undefined,
		description: row.description ?? undefined,
		source: row.source ?? undefined,
		contentType: row.content_type ?? undefined,
		size: row.size ?? undefined,
		uploadedAt: row.uploaded_at ?? undefined,
		public: row.public === 1 ? true : row.public === 0 ? false : undefined,
	};
}

/** Atomic insert or update a media record by bucket+key */
export async function upsertMedia(
	db: D1Database,
	entry: MediaEntry,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO media (bucket, key, title, description, source, content_type, size, uploaded_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(bucket, key) DO UPDATE SET
			   title=excluded.title, description=excluded.description, source=excluded.source,
			   content_type=excluded.content_type, size=excluded.size, uploaded_at=excluded.uploaded_at,
			   indexed_at=datetime('now')`,
		)
		.bind(
			entry.bucket,
			entry.key,
			entry.title ?? null,
			entry.description ?? null,
			entry.source ?? null,
			entry.contentType ?? null,
			entry.size ?? null,
			entry.uploadedAt ?? null,
		)
		.run();
}

/** Get a media record by bucket + key */
export async function getMediaByKey(
	db: D1Database,
	bucket: string,
	key: string,
): Promise<MediaEntry | null> {
	const row = await db
		.prepare("SELECT * FROM media WHERE bucket = ? AND key = ?")
		.bind(bucket, key)
		.first<MediaRow>();
	return row ? rowToEntry(row) : null;
}

/** Search media with optional bucket, tag, and sort filters */
export async function searchMedia(
	db: D1Database,
	query: string,
	limit = 50,
	bucket?: string,
	tag?: string,
	sort = "relevance",
): Promise<MediaEntry[]> {
	const binds: unknown[] = [];

	let sql = "SELECT DISTINCT m.* FROM media m";
	sql += " LEFT JOIN media_tags mt ON mt.media_id = m.id LEFT JOIN tags t ON t.id = mt.tag_id";

	const where: string[] = [];

	if (query) {
		const escaped = query.replace(/%/g, "\\%").replace(/_/g, "\\_");
		const pattern = `%${escaped}%`;
		where.push("(m.title LIKE ? ESCAPE '\\' OR m.description LIKE ? ESCAPE '\\' OR t.name LIKE ? ESCAPE '\\')");
		binds.push(pattern, pattern, pattern);
	}

	if (bucket) { where.push("m.bucket = ?"); binds.push(bucket); }
	if (tag) { where.push("t.slug = ?"); binds.push(tag); }

	if (where.length) sql += " WHERE " + where.join(" AND ");

	switch (sort) {
		case "newest": sql += " ORDER BY m.uploaded_at DESC"; break;
		case "oldest": sql += " ORDER BY m.uploaded_at ASC"; break;
		case "name": sql += " ORDER BY m.key ASC"; break;
		default: sql += " ORDER BY m.indexed_at DESC"; break;
	}

	sql += " LIMIT ?";
	binds.push(limit);

	const result = await db.prepare(sql).bind(...binds).all<MediaRow>();
	return result.results.map(rowToEntry);
}

/** List all public media, newest first */
export async function listPublicMedia(db: D1Database, limit = 100): Promise<MediaEntry[]> {
	const result = await db
		.prepare("SELECT * FROM media WHERE public = 1 ORDER BY uploaded_at DESC LIMIT ?")
		.bind(limit)
		.all<MediaRow>();
	return result.results.map(rowToEntry);
}
