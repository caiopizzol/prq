import chalk from "chalk";
import type { CategorizedPR, PRCategory } from "./types.js";

export const CATEGORY_CONFIG: Record<
	PRCategory,
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
		label: "Needs Re-review",
		color: chalk.yellow,
	},
	requested: { icon: "●", label: "Requested Reviews", color: chalk.green },
	stale: { icon: "○", label: "Stale", color: chalk.red },
	"waiting-on-others": {
		icon: "◇",
		label: "Your PRs Waiting",
		color: chalk.dim,
	},
	open: {
		icon: "◦",
		label: "All Open",
		color: chalk.dim,
	},
};

export const CATEGORY_ORDER: PRCategory[] = [
	"in-progress",
	"nudged",
	"needs-re-review",
	"requested",
	"stale",
	"waiting-on-others",
	"open",
];

const CATEGORY_INDEX = new Map(CATEGORY_ORDER.map((c, i) => [c, i]));

export function sortByCategory(prs: CategorizedPR[]): CategorizedPR[] {
	return [...prs].sort((a, b) => {
		const catDiff =
			(CATEGORY_INDEX.get(a.category) ?? 99) -
			(CATEGORY_INDEX.get(b.category) ?? 99);
		if (catDiff !== 0) return catDiff;
		return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
	});
}
