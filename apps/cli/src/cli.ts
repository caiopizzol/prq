import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { nudgeCommand } from "./commands/nudge.js";
import { runCommand } from "./commands/run.js";
import { statusCommand } from "./commands/status.js";
import { loadConfig } from "./config.js";

function getVersion(): string {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	for (const rel of ["../../package.json", "../package.json"]) {
		const p = path.resolve(__dirname, rel);
		if (fs.existsSync(p)) {
			return JSON.parse(fs.readFileSync(p, "utf8")).version;
		}
	}
	return "0.0.0";
}

export function createCLI(): Command {
	const program = new Command();

	program
		.name("prq")
		.description("PR Queue — see what code reviews need your attention")
		.version(getVersion());

	program
		.command("status", { isDefault: true })
		.description("Show PRs needing your attention")
		.option("-r, --repos <repos...>", "Filter to specific repos (owner/name)")
		.option(
			"-s, --stale-days <days>",
			"Days of inactivity to consider stale",
			"3",
		)
		.option("--json", "Output as JSON")
		.action(async (opts) => {
			const config = loadConfig({
				repos: opts.repos,
				staleDays: opts.staleDays ? parseInt(opts.staleDays, 10) : undefined,
			});

			await statusCommand(config, opts.json ?? false);
		});

	// Built-in action shortcuts
	program
		.command("open <identifier>")
		.description("Open a PR in the browser")
		.action(async (identifier: string) => {
			const config = loadConfig({});
			await runCommand("open", identifier, config);
		});

	program
		.command("review <identifier>")
		.description("Open PR files changed tab for review")
		.action(async (identifier: string) => {
			const config = loadConfig({});
			await runCommand("review", identifier, config);
		});

	program
		.command("nudge <identifier>")
		.description("Post a nudge comment on a PR")
		.option("-m, --message <msg>", "Custom nudge message")
		.option("-y, --yes", "Skip confirmation")
		.action(async (identifier: string, opts) => {
			const config = loadConfig({});
			await nudgeCommand(identifier, config, {
				message: opts.message,
				yes: opts.yes ?? false,
			});
		});

	// Generic action runner for custom actions
	program
		.command("run <action> <identifier>")
		.description("Run a custom action on a PR")
		.action(async (action: string, identifier: string) => {
			const config = loadConfig({});
			await runCommand(action, identifier, config);
		});

	program
		.command("init")
		.description("Create config file interactively")
		.action(async () => {
			await initCommand();
		});

	return program;
}
