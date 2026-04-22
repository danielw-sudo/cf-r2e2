import type { AppEnv } from "../types";

const NON_BUCKET_KEYS = new Set([
	"ASSETS", "AI", "DB", "CF_ACCESS_TEAM_NAME", "SHARE_DOMAIN", "R2E2_CONFIG", "R2E2_CORS",
]);

function isR2Bucket(value: unknown): value is R2Bucket {
	return (
		!!value &&
		typeof value === "object" &&
		"get" in value &&
		"put" in value &&
		typeof (value as { get: unknown }).get === "function" &&
		typeof (value as { put: unknown }).put === "function"
	);
}

/** Validate a bucket-binding name and return the R2Bucket, or null if not found. */
export function resolveBucket(env: AppEnv, name: string): R2Bucket | null {
	if (!name || NON_BUCKET_KEYS.has(name)) return null;
	// Conservative allowlist on binding name shape — matches wrangler.toml convention
	if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) return null;
	const candidate = (env as unknown as Record<string, unknown>)[name];
	return isR2Bucket(candidate) ? candidate : null;
}

/** Get all R2 bucket bindings from env (duck-type filter) */
export function getBuckets(env: AppEnv): { name: string; bucket: R2Bucket }[] {
	const buckets: { name: string; bucket: R2Bucket }[] = [];
	for (const [key, value] of Object.entries(env)) {
		if (NON_BUCKET_KEYS.has(key)) continue;
		if (isR2Bucket(value)) buckets.push({ name: key, bucket: value });
	}
	return buckets;
}
