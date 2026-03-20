import index from "./index.html";

Bun.serve({
	port: 3005,
	routes: {
		"/": index,
	},
	development: {
		hmr: true,
		console: true,
	},
});

console.log("prq.dev running on http://localhost:3005");
