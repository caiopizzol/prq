import chalk from "chalk";
import type { CategorizedItem, ItemCategory } from "./types.js";

export const CATEGORY_CONFIG: Record<
	ItemCategory,
	{ icon: string; label: string; color: (s: string) => string }
> = {
	"in-progress": {
		icon: "▸",
		label: "In Progress",
		color: chalk.cyan,
	},
	nudged: {
		icon: "✦",
		label: "Nudged",
		color: chalk.magenta,
	},
	"needs-re-review": {
		icon: "◆",
		label: "Needs Response",
		color: chalk.yellow,
	},
	requested: { icon: "●", label: "Requested", color: chalk.green },
	stale: { icon: "○", label: "Stale", color: chalk.red },
	"waiting-on-others": {
		icon: "◇",
		label: "Waiting on Others",
		color: chalk.dim,
	},
	mentioned: {
		icon: "·",
		label: "Mentioned",
		color: chalk.dim,
	},
	open: {
		icon: "◦",
		label: "All Open",
		color: chalk.dim,
	},
};

export const CATEGORY_ORDER: ItemCategory[] = [
	"in-progress",
	"nudged",
	"needs-re-review",
	"requested",
	"stale",
	"waiting-on-others",
	"mentioned",
	"open",
];

const CATEGORY_INDEX = new Map(CATEGORY_ORDER.map((c, i) => [c, i]));

export function sortByCategory(items: CategorizedItem[]): CategorizedItem[] {
	return [...items].sort((a, b) => {
		const catDiff =
			(CATEGORY_INDEX.get(a.category) ?? 99) -
			(CATEGORY_INDEX.get(b.category) ?? 99);
		if (catDiff !== 0) return catDiff;
		return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
	});
}
