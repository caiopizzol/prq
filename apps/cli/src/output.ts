import chalk from "chalk";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./categories.js";
import { typePrefix } from "./format.js";
import type { CategorizedItem, ItemCategory, StatusResult } from "./types.js";

function formatItem(item: CategorizedItem): string {
	const draft = item.isDraft ? chalk.dim(" [draft]") : "";
	const prefix = typePrefix(item);
	const ref = chalk.cyan(`${item.repo}#${item.number}`);
	const title =
		item.title.length > 60 ? `${item.title.slice(0, 57)}...` : item.title;

	const author = chalk.dim(`@${item.author}`);

	return [
		`  ${prefix} ${ref}  ${title}${draft}`,
		`        ${chalk.dim("↳")} ${author} ${chalk.dim("·")} ${chalk.dim(item.detail)}`,
	].join("\n");
}

export function formatStatus(result: StatusResult): string {
	const lines: string[] = [];
	const separator = chalk.dim("─".repeat(50));

	lines.push("");
	lines.push(chalk.bold(` PRQ Status for ${result.user}`));
	lines.push(` ${separator}`);

	const grouped = new Map<ItemCategory, CategorizedItem[]>();
	for (const item of result.items) {
		const list = grouped.get(item.category) ?? [];
		list.push(item);
		grouped.set(item.category, list);
	}

	let hasContent = false;

	for (const category of CATEGORY_ORDER) {
		const items = grouped.get(category);
		if (!items || items.length === 0) continue;

		hasContent = true;
		const config = CATEGORY_CONFIG[category];
		lines.push("");
		lines.push(
			` ${config.color(`${config.icon} ${config.label}`)} ${chalk.dim(`(${items.length})`)}`,
		);

		for (const item of items) {
			lines.push(formatItem(item));
		}
	}

	if (!hasContent) {
		lines.push("");
		lines.push(chalk.green("  All clear! Nothing needs your attention."));
	}

	lines.push("");
	lines.push(` ${separator}`);

	const actionable = result.items.filter((item) => item.category !== "open");
	if (actionable.length > 0) {
		const prCount = actionable.filter((i) => i.type === "pr").length;
		const issueCount = actionable.filter((i) => i.type === "issue").length;
		const repos = new Set(actionable.map((i) => i.repo)).size;

		const parts: string[] = [];
		if (prCount > 0) parts.push(`${prCount} PR${prCount === 1 ? "" : "s"}`);
		if (issueCount > 0)
			parts.push(`${issueCount} issue${issueCount === 1 ? "" : "s"}`);
		parts.push(`${repos} repo${repos === 1 ? "" : "s"}`);

		lines.push(chalk.dim(` ${parts.join(" · ")}`));
	}

	lines.push("");
	return lines.join("\n");
}
