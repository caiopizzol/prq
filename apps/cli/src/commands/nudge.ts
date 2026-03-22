import readline from "node:readline";
import chalk from "chalk";
import type { Config } from "../config.js";
import { getClient } from "../github/client.js";
import { resolveIdentifier } from "../identifier.js";
import { getNudgedAt, markNudged } from "../state.js";

async function confirm(question: string): Promise<boolean> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		const answer = await new Promise<string>((resolve) =>
			rl.question(question, resolve),
		);
		return answer.toLowerCase() === "y";
	} finally {
		rl.close();
	}
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

	const repo = `${pr.owner}/${pr.repo}`;
	const label = `${repo}#${pr.number}`;
	const nudgedAt = getNudgedAt({ repo, number: pr.number });

	if (nudgedAt && !options.yes) {
		const ago = daysAgo(nudgedAt);
		const agoText =
			ago === 0 ? "today" : `${ago} day${ago === 1 ? "" : "s"} ago`;
		console.log();
		console.log(chalk.yellow(`  This PR was already nudged ${agoText}.`));

		if (!(await confirm(chalk.yellow("  Nudge again? (y/N) ")))) {
			console.log(chalk.dim("  Cancelled."));
			return;
		}
	}

	const days = daysAgo(data.updated_at);
	const message =
		options.message ??
		`Hey @${data.user?.login ?? pr.author}, is this PR still active? It's been ${days} day${days === 1 ? "" : "s"} since the last activity.`;

	if (!options.yes) {
		console.log();
		console.log(chalk.bold(`  ${data.title}`));
		console.log(chalk.dim(`  ${label}`));
		console.log();
		console.log(`  ${chalk.dim("Message:")} ${message}`);
		console.log();

		if (!(await confirm(chalk.yellow("  Post this comment? (y/n) ")))) {
			console.log(chalk.dim("  Cancelled."));
			return;
		}
	}

	await client.issues.createComment({
		owner: pr.owner,
		repo: pr.repo,
		issue_number: pr.number,
		body: message,
	});

	markNudged({ repo, number: pr.number });
	console.log(chalk.green(`  Comment posted on ${label}`));
}
