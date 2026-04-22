import { cloudflareAccess } from "@hono/cloudflare-access";
import {
	type OpenAPIObjectConfigV31,
	extendZodWithOpenApi,
	fromHono,
} from "chanfana";
import { type ExecutionContext, Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { cors } from "hono/cors";
import { z } from "zod";
import { readOnlyMiddleware } from "./foundation/middlewares/readonly";
import { settings } from "./foundation/settings";
import { CreateFolder } from "./modules/buckets/createFolder";
import { DeleteObject } from "./modules/buckets/deleteObject";
import { GetObject } from "./modules/buckets/getObject";
import { HeadObject } from "./modules/buckets/headObject";
import { ListObjects } from "./modules/buckets/listObjects";
import { MoveObject } from "./modules/buckets/moveObject";
import { CompleteUpload } from "./modules/buckets/multipart/completeUpload";
import { CreateUpload } from "./modules/buckets/multipart/createUpload";
import { PartUpload } from "./modules/buckets/multipart/partUpload";
import { PutMetadata } from "./modules/buckets/putMetadata";
import { PutObject } from "./modules/buckets/putObject";
import { dashboardIndex, dashboardRedirect } from "./modules/dashboard";
import { GetInfo } from "./modules/server/getInfo";
import { AnalyzeImage } from "./modules/ai/analyze";
import { handleCron } from "./modules/ai/cron";
import { TagImage } from "./modules/ai/tagger";
import { GetUsageSummary, GetRecentUsage } from "./modules/ai/usageRoute";
import { PresignObject, servePresigned } from "./modules/buckets/presignObject";
import { TogglePublic, servePublic } from "./modules/buckets/publicShare";
import { galleryApi } from "./modules/share/gallery";
import { GALLERY_HTML } from "./modules/share/galleryHtml";
import { NOT_FOUND_HTML } from "./modules/share/notFoundHtml";
import { ListShared } from "./modules/share/sharedRoute";
import { GetAiSettings, PutAiSettings } from "./modules/settings/aiSettings";
import { GetSettingsRoute, PutSettingsRoute } from "./modules/settings/settingsD1";
import { BackfillMedia } from "./modules/db/backfill";
import { ScanOrphans, CleanOrphans } from "./modules/admin/orphans";
import { SearchMedia } from "./modules/db/searchRoute";
import { ListTagsRoute, CreateTagRoute, AttachTagsRoute, DetachTagsRoute, GetMediaTagsRoute, RenameTagRoute, DeleteTagRoute, MergeTagsRoute } from "./modules/db/tagRoutes";
import type { AppContext, AppEnv, AppVariables, BasicAuthType, R2E2Config } from "./types";

const SHARE_ASSET_RE = /^\/share\/(p|t)\/[^/]+\/[^/]+\/?$/;

function isValidSharePath(p: string): boolean {
	if (p === "/share" || p === "/share/") return true;
	if (p === "/share/gallery") return true;
	return SHARE_ASSET_RE.test(p);
}

export function R2E2(config?: R2E2Config) {
	extendZodWithOpenApi(z);
	config = config || {};
	if (config.readonly !== false) config.readonly = true;

	const openapiSchema: OpenAPIObjectConfigV31 = {
		openapi: "3.1.0",
		info: {
			title: "R2 Explorer API",
			version: settings.version,
		},
	};

	if (config.basicAuth) {
		openapiSchema["security"] = [{ basicAuth: [] }];
	}

	const app = new Hono<{ Bindings: AppEnv; Variables: AppVariables }>();
	app.use("*", async (c, next) => {
		c.set("config", config);
		// share.tools4all.ai is a locked-down surface — only signed asset routes
		// and the gallery are served. Anything else gets the cute 404 page that
		// auto-redirects to tools4all.ai.
		const host = new URL(c.req.url).hostname;
		if (host === c.env.SHARE_DOMAIN && !isValidSharePath(c.req.path)) {
			return c.html(NOT_FOUND_HTML, 404);
		}
		await next();
	});

	const openapi = fromHono(app, {
		schema: openapiSchema,
		raiseUnknownParameters: true,
		generateOperationIds: false,
	});

	if (config.cors === true) {
		app.use("/api/*", cors());
	}

	if (config.readonly === true) {
		app.use("/api/*", readOnlyMiddleware);
	}

	if (config.cfAccessTeamName) {
		app.use("/api/*", cloudflareAccess(config.cfAccessTeamName));
		app.use("/api/*", async (c, next) => {
			c.set("authentication_type", "cloudflare-access");
			c.set("authentication_username", c.get("accessPayload").email);
			await next();
		});
	}

	if (config.basicAuth) {
		openapi.registry.registerComponent("securitySchemes", "basicAuth", {
			type: "http",
			scheme: "basic",
		});
		app.use(
			"/api/*",
			basicAuth({
				invalidUserMessage: "Authentication error: Basic Auth required",
				verifyUser: (username, password, c: AppContext) => {
					const users = (
						Array.isArray(c.get("config").basicAuth)
							? c.get("config").basicAuth
							: [c.get("config").basicAuth]
					) as BasicAuthType[];

					for (const user of users) {
						if (user.username === username && user.password === password) {
							c.set("authentication_type", "basic-auth");
							c.set("authentication_username", username);
							return true;
						}
					}

					return false;
				},
			}),
		);
	}

	// Server
	openapi.get("/api/server/config", GetInfo);
	// Buckets
	openapi.get("/api/buckets/:bucket", ListObjects);
	openapi.post("/api/buckets/:bucket/move", MoveObject);
	openapi.post("/api/buckets/:bucket/folder", CreateFolder);
	openapi.post("/api/buckets/:bucket/upload", PutObject);
	openapi.post("/api/buckets/:bucket/multipart/create", CreateUpload);
	openapi.post("/api/buckets/:bucket/multipart/upload", PartUpload);
	openapi.post("/api/buckets/:bucket/multipart/complete", CompleteUpload);
	openapi.post("/api/buckets/:bucket/delete", DeleteObject);
	openapi.on("head", "/api/buckets/:bucket/:key", HeadObject);
	openapi.get("/api/buckets/:bucket/:key/head", HeadObject);
	openapi.get("/api/buckets/:bucket/:key", GetObject);
	openapi.post("/api/buckets/:bucket/:key", PutMetadata);
	// AI + presign
	openapi.post("/api/buckets/:bucket/analyze/:key", AnalyzeImage);
	openapi.post("/api/buckets/:bucket/presign/:key", PresignObject);
	openapi.post("/api/buckets/:bucket/public/:key", TogglePublic);
	openapi.get("/api/ai/usage", GetUsageSummary);
	openapi.get("/api/ai/usage/recent", GetRecentUsage);
	// Settings
	openapi.get("/api/settings/ai", GetAiSettings);
	openapi.put("/api/settings/ai", PutAiSettings);
	openapi.get("/api/settings/d1/:namespace", GetSettingsRoute);
	openapi.put("/api/settings/d1/:namespace", PutSettingsRoute);
	// Admin + search
	openapi.post("/api/admin/backfill", BackfillMedia);
	openapi.get("/api/admin/orphans", ScanOrphans);
	openapi.post("/api/admin/orphans/clean", CleanOrphans);
	openapi.get("/api/search", SearchMedia);
	openapi.get("/api/shared", ListShared);
	// Tags
	openapi.get("/api/tags", ListTagsRoute);
	openapi.post("/api/tags", CreateTagRoute);
	openapi.post("/api/tags/merge", MergeTagsRoute);
	openapi.put("/api/tags/:slug", RenameTagRoute);
	openapi.delete("/api/tags/:slug", DeleteTagRoute);
	openapi.get("/api/buckets/:bucket/:key/tags", GetMediaTagsRoute);
	openapi.post("/api/buckets/:bucket/:key/tags", AttachTagsRoute);
	openapi.delete("/api/buckets/:bucket/:key/tags", DetachTagsRoute);
	openapi.post("/api/buckets/:bucket/autotag/:key", TagImage);
	// Share routes — outside /api/* to bypass Zero Trust auth
	app.get("/share/t/:bucket/:token", servePresigned);
	app.get("/share/p/:bucket/:token", servePublic);
	app.get("/share/gallery", galleryApi);
	app.get("/share", (c) => c.html(GALLERY_HTML));
	app.get("/share/", (c) => c.html(GALLERY_HTML));
	// Dashboard
	openapi.get("/", dashboardIndex);
	openapi.get("*", dashboardRedirect);

	app.all("*", (c) => {
		const host = new URL(c.req.url).hostname;
		if (host === c.env.SHARE_DOMAIN) return c.html(NOT_FOUND_HTML, 404);
		return Response.json({ msg: "404, not found!" }, { status: 404 });
	});

	return {
		async fetch(request: Request, env: AppEnv, context: ExecutionContext) {
			return app.fetch(request, env, context);
		},
	};
}

function parseEnvConfig(env: AppEnv): R2E2Config {
	let config: R2E2Config = {};
	const raw = (env as any).R2E2_CONFIG;
	if (raw && typeof raw === "string") {
		try { config = JSON.parse(raw); } catch (e) { console.error("Failed to parse R2E2_CONFIG:", e); }
	}
	const team = (env as any).CF_ACCESS_TEAM_NAME;
	if (team && typeof team === "string") config.cfAccessTeamName = team;
	if ((env as any).R2E2_CORS === "true") config.cors = true;
	return config;
}

export default {
	async fetch(request: Request, env: AppEnv, context: ExecutionContext) {
		return R2E2(parseEnvConfig(env)).fetch(request, env, context);
	},
	async scheduled(_event: ScheduledEvent, env: AppEnv, ctx: ExecutionContext) {
		ctx.waitUntil(handleCron(env));
	},
};