import { join } from "node:path";
import index from "./index.html";

const publicDir = join(import.meta.dir, "../public");

// Build changelog from GitHub releases before serving
await import("./build-changelog.ts");
const changelog = (await import("./changelog.html")).default;

Bun.serve({
	port: 3005,
	routes: {
		"/": index,
		"/changelog": changelog,
	},
	async fetch(req) {
		const url = new URL(req.url);
		const filePath = join(publicDir, url.pathname);
		const file = Bun.file(filePath);
		if (await file.exists()) return new Response(file);
		return new Response("Not found", { status: 404 });
	},
	development: {
		hmr: true,
		console: true,
	},
});

console.log("prq.dev running on http://localhost:3005");
