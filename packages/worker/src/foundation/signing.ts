import type { AppEnv } from "../types";

/** HMAC-SHA256 signing for share tokens. Uses CF_ACCESS_TEAM_NAME as the secret
 *  salt (consistent with presignObject.ts). For true secret rotation, set
 *  SHARE_SIGNING_KEY as a wrangler secret and swap the salt below. */
function getSecret(env: AppEnv, bucket: string): string {
	const salt = (env as unknown as { SHARE_SIGNING_KEY?: string }).SHARE_SIGNING_KEY
		|| env.CF_ACCESS_TEAM_NAME
		|| "";
	if (!salt) throw new Error("Signing requires SHARE_SIGNING_KEY or CF_ACCESS_TEAM_NAME");
	return bucket + "::" + salt;
}

function toBase64Url(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
	const pad = "=".repeat((4 - (s.length % 4)) % 4);
	const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function hmac(secret: string, message: string, mode: "sign" | "verify" = "sign") {
	const enc = new TextEncoder();
	return crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		[mode],
	);
}

/** Produce a compact share token: base64url(key).base64url(sig) */
export async function signShareKey(env: AppEnv, bucket: string, key: string): Promise<string> {
	const secret = getSecret(env, bucket);
	const cryptoKey = await hmac(secret, "", "sign");
	const enc = new TextEncoder();
	const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(key));
	return toBase64Url(enc.encode(key)) + "." + toBase64Url(new Uint8Array(sig));
}

/** Verify a share token, returning the object key, or null on failure. */
export async function verifyShareToken(
	env: AppEnv,
	bucket: string,
	token: string,
): Promise<string | null> {
	const [keyB64, sigB64] = token.split(".");
	if (!keyB64 || !sigB64) return null;
	let key: string;
	try { key = new TextDecoder().decode(fromBase64Url(keyB64)); } catch { return null; }
	let sigBytes: Uint8Array;
	try { sigBytes = fromBase64Url(sigB64); } catch { return null; }

	const secret = getSecret(env, bucket);
	const cryptoKey = await hmac(secret, "", "verify");
	const ok = await crypto.subtle.verify(
		"HMAC",
		cryptoKey,
		sigBytes,
		new TextEncoder().encode(key),
	);
	return ok ? key : null;
}

/** Sign a JSON payload for time-limited access (presigned URLs). */
export async function signPayload(env: AppEnv, bucket: string, payload: object): Promise<string> {
	const secret = getSecret(env, bucket);
	const cryptoKey = await hmac(secret, "", "sign");
	const enc = new TextEncoder();
	const json = JSON.stringify(payload);
	const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(json));
	return toBase64Url(enc.encode(json)) + "." + toBase64Url(new Uint8Array(sig));
}

/** Verify a signed JSON payload; returns parsed object or null. */
export async function verifyPayload<T>(
	env: AppEnv,
	bucket: string,
	token: string,
): Promise<T | null> {
	const [payloadB64, sigB64] = token.split(".");
	if (!payloadB64 || !sigB64) return null;
	let json: string;
	try { json = new TextDecoder().decode(fromBase64Url(payloadB64)); } catch { return null; }
	let sigBytes: Uint8Array;
	try { sigBytes = fromBase64Url(sigB64); } catch { return null; }

	const secret = getSecret(env, bucket);
	const cryptoKey = await hmac(secret, "", "verify");
	const ok = await crypto.subtle.verify(
		"HMAC",
		cryptoKey,
		sigBytes,
		new TextEncoder().encode(json),
	);
	if (!ok) return null;
	try { return JSON.parse(json) as T; } catch { return null; }
}
