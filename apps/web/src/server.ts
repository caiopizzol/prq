import { join } from "node:path";
import index from "./index.html";

const publicDir = join(import.meta.dir, "../public");

Bun.serve({
	port: 3005,
	routes: {
		"/": index,
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
