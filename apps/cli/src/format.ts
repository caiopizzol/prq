import chalk from "chalk";
import type { CategorizedItem } from "./types.js";

export function typePrefix(item: CategorizedItem, highlighted = true): string {
	const label =
		item.source === "linear"
			? "Linear"
			: item.type === "pr"
				? "PR    "
				: "Issue ";
	if (highlighted) {
		if (item.source === "linear") return chalk.hex("#5E6AD2")(label);
		if (item.type === "pr") return chalk.hex("#A78BFA")(label);
		return chalk.hex("#60A5FA")(label);
	}
	return chalk.dim(label);
}

export function itemRef(item: CategorizedItem): string {
	if (item.source === "linear") return `${item.repo}-${item.number}`;
	return `${item.repo}#${item.number}`;
}
