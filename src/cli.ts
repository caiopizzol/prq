import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { loadConfig } from "./config.js";

export function createCLI(): Command {
	const program = new Command();

	program
		.name("prq")
		.description("PR Queue — see what code reviews need your attention")
		.version("0.1.0");

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

	program
		.command("init")
		.description("Create config file interactively")
		.action(async () => {
			await initCommand();
		});

	return program;
}
