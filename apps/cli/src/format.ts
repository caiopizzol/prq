import chalk from "chalk";
import type { CategorizedItem } from "./types.js";

export function typePrefix(item: CategorizedItem, highlighted = true): string {
	if (highlighted) {
		if (item.type === "pr") return chalk.hex("#A78BFA")("PR   ");
		return chalk.hex("#60A5FA")("Issue");
	}
	if (item.type === "pr") return chalk.dim("PR   ");
	return chalk.dim("Issue");
}
