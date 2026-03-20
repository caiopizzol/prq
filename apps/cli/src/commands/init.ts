import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import chalk from "chalk";
import { getAuthenticatedUser } from "../github/client.js";

function ask(rl: readline.Interface, question: string): Promise<string> {
	return new Promise((resolve) => rl.question(question, resolve));
}

export async function initCommand(): Promise<void> {
	const configPath = path.join(process.cwd(), ".prqrc.json");

	if (fs.existsSync(configPath)) {
		const existing = JSON.parse(fs.readFileSync(configPath, "utf8"));
		console.log(chalk.yellow("Config already exists at"), configPath);
		console.log(JSON.stringify(existing, null, 2));
		console.log();
		console.log(
			chalk.dim("Edit the file directly or delete it and run init again."),
		);
		return;
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		console.log(chalk.bold("\n  prq init\n"));

		try {
			const user = await getAuthenticatedUser();
			console.log(chalk.green(`  Authenticated as ${user}`));
		} catch {
			console.log(
				chalk.red("  Could not authenticate. Run `gh auth login` first."),
			);
			return;
		}

		console.log();
		const reposInput = await ask(
			rl,
			chalk.dim(
				"  Repos to watch (comma-separated, e.g. org/repo1,org/repo2)\n  Leave empty to watch all: ",
			),
		);
		const repos = reposInput
			.split(",")
			.map((r) => r.trim())
			.filter(Boolean);

		const staleDaysInput = await ask(
			rl,
			chalk.dim("  Days of inactivity to consider stale (default: 3): "),
		);
		const staleDays = staleDaysInput ? Number.parseInt(staleDaysInput, 10) : 3;

		const config = {
			repos,
			staleDays,
		};

		fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

		console.log();
		console.log(chalk.green(`  Created ${configPath}`));
		console.log(chalk.dim("  Run `prq` to see your review queue."));
		console.log();
	} finally {
		rl.close();
	}
}
