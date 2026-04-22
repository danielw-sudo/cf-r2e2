import AppShell from "layouts/AppShell.vue";
import FileBrowserView from "pages/FileBrowserView.vue";

const routes = [
	{
		path: "/auth",
		component: () => import("layouts/AuthLayout.vue"),
		children: [
			{
				path: "login",
				name: "login",
				component: () => import("pages/auth/LoginPage.vue"),
			},
		],
	},
	{
		path: "/",
		component: AppShell,
		children: [
			{
				path: "/",
				redirect: "/gallery",
			},
			// New views (placeholder pages until Sprints 2-5)
			{
				path: "/upload",
				name: "upload",
				component: () => import("pages/UploadView.vue"),
			},
			{
				path: "/gallery",
				name: "gallery",
				component: () => import("pages/GalleryView.vue"),
			},
			{
				path: "/shared",
				name: "shared",
				component: () => import("pages/SharedView.vue"),
			},
			{
				path: "/search",
				name: "search",
				component: () => import("pages/SearchView.vue"),
			},
			{
				path: "/usage",
				redirect: "/settings",
			},
			{
				path: "/tags",
				name: "tags",
				component: () => import("pages/TagsView.vue"),
			},
			{
				path: "/tasks",
				name: "tasks",
				component: () => import("pages/TasksView.vue"),
			},
			{
				path: "/settings",
				name: "settings",
				component: () => import("pages/SettingsView.vue"),
			},
			// Existing file browser routes
			{
				path: "/:bucket/files",
				name: "files-home",
				component: FileBrowserView,
			},
			{
				path: "/:bucket/files/:folder",
				name: "files-folder",
				component: FileBrowserView,
			},
			{
				path: "/:bucket/files/:folder/:file",
				name: "files-file",
				component: FileBrowserView,
			},
			// Backwards compatibility
			{
				path: "/storage/:bucket",
				redirect: (to) => ({
					name: "files-home",
					params: { bucket: to.params.bucket },
				}),
			},
			{
				path: "/storage/:bucket/:folder",
				redirect: (to) => ({
					name: "files-folder",
					params: { bucket: to.params.bucket, folder: to.params.folder },
				}),
			},
			{
				path: "/storage/:bucket/:folder/:file",
				redirect: (to) => ({
					name: "files-file",
					params: {
						bucket: to.params.bucket,
						folder: to.params.folder,
						file: to.params.file,
					},
				}),
			},
		],
	},
	{
		path: "/:catchAll(.*)*",
		component: () => import("pages/ErrorNotFound.vue"),
	},
];

export default routes;
