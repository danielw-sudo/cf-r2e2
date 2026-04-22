import { z } from "zod";

export const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "avif", "gif", "bmp"];

export const DEFAULT_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

export interface ModelDef {
	id: string;
	name: string;
	tier: "fast" | "balanced" | "quality";
	note: string;
}

export const VISION_MODELS: ModelDef[] = [
	{ id: "@cf/meta/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", tier: "balanced", note: "Recommended — multimodal, natively supports images" },
	{ id: "@cf/mistralai/mistral-small-3.1-24b-instruct", name: "Mistral Small 3.1 24B", tier: "quality", note: "Vision + 128K context" },
	{ id: "@cf/meta/llama-3.2-11b-vision-instruct", name: "Llama 3.2 11B Vision", tier: "fast", note: "EU license gate — may be blocked" },
];

export const DEFAULT_MAX_TOKENS = 512;
export const DEFAULT_TAGGER_MAX_TOKENS = 256;

export const SYSTEM_PROMPT = `You are a media archivist. Analyze the image and respond ONLY with valid JSON — no markdown, no text outside the JSON object.
{"title":"<2-6 word descriptive title>","description":"<one sentence, max 160 chars, describing content and style>","source":"<photograph|AI-generated|digital art|illustration|screenshot|stock photo|unknown>"}
RULES:
- title MUST name what is depicted (e.g. "Golden Retriever on Beach", "Neon Cityscape at Night"). NEVER use generic titles like "Untitled", "Image", "Artwork", "Beautiful Scene".
- description should mention subjects, colors, mood, and medium/style.
- If uncertain about source, say "unknown".`;

export const TAGGER_PROMPT = `You are a media tagger. Given the image, suggest 3-5 descriptive tags. Respond ONLY with valid JSON — no markdown, no text outside the JSON object.
{"tags":["tag1","tag2","tag3"]}
RULES:
- Tags must describe visible content: subjects, style, colors, mood, setting. Examples: "cat", "portrait", "watercolor", "sunset", "cyberpunk".
- NEVER use meta-tags like "untagged", "no-tag", "misc", "other", "general", "image", "photo".
- Prefer existing tags when they fit: {{TAGS}}
- Only invent new tags if nothing existing applies. Keep tags lowercase, 1-2 words or hyphenated.`;

const BANNED_TAGS = new Set(["untagged", "no-tag", "misc", "other", "general", "image", "photo", "unknown", "untitled"]);

export const TagsSchema = z.object({
	tags: z.array(z.string().min(1)).min(1).max(10).catch([]),
}).transform((v) => ({ tags: v.tags.filter((t) => !BANNED_TAGS.has(t.toLowerCase())) }));

export const MetaSchema = z.object({
	title: z.string().min(1).catch("Unprocessed Image"),
	description: z.string().min(1).catch("No description"),
	source: z.string().min(1).catch("unknown"),
});

export type ImageMeta = z.infer<typeof MetaSchema>;

export interface FileInfo {
	uploaded: string;
	size: number;
	contentType: string;
}

export interface SidecarMeta extends ImageMeta {
	fileInfo?: FileInfo;
}

/** Check if a key is an image by extension */
export function isImage(key: string): boolean {
	const ext = key.split(".").pop()?.toLowerCase() ?? "";
	return IMAGE_EXTS.includes(ext);
}

/** Convert raw bytes to a base64 data URI */
export function toDataUri(bytes: Uint8Array, contentType: string): string {
	let bin = "";
	for (let i = 0; i < bytes.length; i++) {
		bin += String.fromCharCode(bytes[i]);
	}
	return `data:${contentType};base64,${btoa(bin)}`;
}

/** Extract AI response text from the Workers AI response object */
export function extractText(response: unknown): string {
	if (typeof response === "object" && response && "response" in response) {
		const inner = (response as { response: unknown }).response;
		if (typeof inner === "string") return inner;
		if (typeof inner === "object" && inner) return JSON.stringify(inner);
	}
	if (typeof response === "object" && response) return JSON.stringify(response);
	return String(response);
}

/** Strip markdown code fences and extract JSON from LLM response */
function extractJson(text: string): string {
	// Remove ```json ... ``` or ``` ... ``` wrappers
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenced) return fenced[1].trim();
	// Try to find a JSON object in the text
	const braced = text.match(/\{[\s\S]*\}/);
	if (braced) return braced[0];
	return text;
}

/** Parse and validate AI response into structured metadata */
export function parseMeta(text: string): ImageMeta {
	try {
		const raw = JSON.parse(extractJson(text));
		return MetaSchema.parse(raw);
	} catch {
		// Last resort: if the text itself looks like a description, use it
		const clean = text.length > 200 ? text.slice(0, 200) + "…" : text;
		return { title: "Unprocessed Image", description: clean, source: "unknown" };
	}
}
