import chalk from "chalk";
import type { Config } from "../config.js";
import { resolveIdentifier } from "../identifier.js";
import { openUrl } from "../platform.js";

export async function reviewCommand(
	identifier: string,
	config: Config,
): Promise<void> {
	const pr = await resolveIdentifier(identifier, config);
	const label = `${pr.owner}/${pr.repo}#${pr.number}`;
	const filesUrl = `${pr.url}/files`;
	process.stderr.write(chalk.dim(`Opening review for ${label}...\n`));
	await openUrl(filesUrl);
}
