import type { AppContext } from "../types";

export function dashboardIndex(c: AppContext) {
	if (c.env.ASSETS === undefined) {
		return c.text(
			"ASSETS binding is not defined, check ASSETS binding in wrangler.toml",
			500,
		);
	}

	const url = new URL(c.req.url);
	return c.env.ASSETS.fetch(new Request(url.origin));
}

export async function dashboardRedirect(c: AppContext, next) {
	if (c.env.ASSETS === undefined) {
		return c.text(
			"ASSETS binding is not defined, check ASSETS binding in wrangler.toml",
			500,
		);
	}

	const url = new URL(c.req.url);

	if (!url.pathname.includes(".")) {
		return c.env.ASSETS.fetch(new Request(url.origin));
	}

	await next();
}
