import type { CloudflareAccessVariables } from "@hono/cloudflare-access";
import type { Context } from "hono";

export type BasicAuthType = {
	username: string;
	password: string;
};

export type R2E2Config = {
	readonly?: boolean;
	cors?: boolean;
	cfAccessTeamName?: string;
	dashboardUrl?: string;
	showHiddenFiles?: boolean;
	basicAuth?: BasicAuthType | BasicAuthType[];
};

export type AppEnv = {
	ASSETS: Fetcher;
	AI: Ai;
	DB: D1Database;
	CF_ACCESS_TEAM_NAME: string;
	SHARE_DOMAIN: string;
	[key: string]: R2Bucket;
};
export type AppVariables = {
	config: R2E2Config;
	authentication_type?: string;
	authentication_username?: string;
} & CloudflareAccessVariables;
export type AppContext = Context<{ Bindings: AppEnv; Variables: AppVariables }>;
