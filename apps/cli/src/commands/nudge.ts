import readline from "node:readline";
import chalk from "chalk";
import type { Config } from "../config.js";
import { getClient } from "../github/client.js";
import { resolveIdentifier } from "../identifier.js";

function ask(rl: readline.Interface, question: string): Promise<string> {
	return new Promise((resolve) => rl.question(question, resolve));
}

function daysAgo(dateStr: string): number {
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export async function nudgeCommand(
	identifier: string,
	config: Config,
	options: { message?: string; yes?: boolean },
): Promise<void> {
	const pr = await resolveIdentifier(identifier, config);

	const client = getClient();
	const { data } = await client.pulls.get({
		owner: pr.owner,
		repo: pr.repo,
		pull_number: pr.number,
	});

	const days = daysAgo(data.updated_at);
	const message =
		options.message ??
		`Hey @${data.user?.login ?? pr.author}, is this PR still active? It's been ${days} day${days === 1 ? "" : "s"} since the last activity.`;

	const label = `${pr.owner}/${pr.repo}#${pr.number}`;

	if (!options.yes) {
		console.log();
		console.log(chalk.bold(`  ${data.title}`));
		console.log(chalk.dim(`  ${label}`));
		console.log();
		console.log(`  ${chalk.dim("Message:")} ${message}`);
		console.log();

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		try {
			const answer = await ask(rl, chalk.yellow("  Post this comment? (y/n) "));
			if (answer.toLowerCase() !== "y") {
				console.log(chalk.dim("  Cancelled."));
				return;
			}
		} finally {
			rl.close();
		}
	}

	await client.issues.createComment({
		owner: pr.owner,
		repo: pr.repo,
		issue_number: pr.number,
		body: message,
	});

	console.log(chalk.green(`  Comment posted on ${label}`));
}
