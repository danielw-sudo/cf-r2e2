/** Decode a base64-encoded R2 key, handling optional URI encoding.
 *  Uses TextDecoder instead of deprecated escape(). */
export function decodeBase64Key(raw: string): string {
	const decode = (b64: string): string => {
		const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
		return new TextDecoder().decode(bytes);
	};
	try {
		return decode(decodeURIComponent(raw));
	} catch {
		return decode(raw);
	}
}
