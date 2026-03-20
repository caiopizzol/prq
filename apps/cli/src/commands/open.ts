import chalk from "chalk";
import type { Config } from "../config.js";
import { resolveIdentifier } from "../identifier.js";
import { openUrl } from "../platform.js";

export async function openCommand(
	identifier: string,
	config: Config,
): Promise<void> {
	const pr = await resolveIdentifier(identifier, config);
	const label = `${pr.owner}/${pr.repo}#${pr.number}`;
	console.log(chalk.dim(`Opening ${label}...`));
	await openUrl(pr.url);
}
