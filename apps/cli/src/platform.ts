import { spawn } from "node:child_process";

export function openUrl(url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const cmd =
			process.platform === "darwin"
				? "open"
				: process.platform === "linux"
					? "xdg-open"
					: process.platform === "win32"
						? "cmd"
						: null;

		if (!cmd) {
			reject(new Error(`Unsupported platform: ${process.platform}`));
			return;
		}

		const args = process.platform === "win32" ? ["/c", "start", url] : [url];
		const child = spawn(cmd, args, { stdio: "ignore", detached: true });
		child.unref();
		child.on("error", reject);
		child.on("close", () => resolve());
	});
}
