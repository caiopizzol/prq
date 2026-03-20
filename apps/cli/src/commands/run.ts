import chalk from "chalk";
import {
	buildContext,
	executeCommand,
	getAction,
	interpolate,
	listActions,
} from "../actions.js";
import type { Config } from "../config.js";
import { resolveIdentifier } from "../identifier.js";

export async function runCommand(
	action: string,
	identifier: string,
	config: Config,
): Promise<void> {
	const template = getAction(action, config);

	if (!template) {
		const available = Object.keys(listActions(config)).join(", ");
		throw new Error(
			`Unknown action: "${action}"\nAvailable actions: ${available}`,
		);
	}

	const pr = await resolveIdentifier(identifier, config);
	const context = buildContext(pr);
	const command = interpolate(template, context);
	const label = `${pr.owner}/${pr.repo}#${pr.number}`;

	process.stderr.write(chalk.dim(`${label} → ${action}: ${command}\n`));

	await executeCommand(command);
}
