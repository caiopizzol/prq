import chalk from "chalk";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./categories.js";
import type { CategorizedPR, PRCategory, StatusResult } from "./types.js";

function formatPR(pr: CategorizedPR): string {
	const draft = pr.isDraft ? chalk.dim(" [draft]") : "";
	const prRef = chalk.cyan(`${pr.repo}#${pr.number}`);
	const title = pr.title.length > 60 ? `${pr.title.slice(0, 57)}...` : pr.title;

	const author = chalk.dim(`@${pr.author}`);

	return [
		`  ${prRef}  ${title}${draft}`,
		`    ${chalk.dim("↳")} ${author} ${chalk.dim("·")} ${chalk.dim(pr.detail)}`,
	].join("\n");
}

export function formatStatus(result: StatusResult): string {
	const lines: string[] = [];
	const separator = chalk.dim("─".repeat(50));

	lines.push("");
	lines.push(chalk.bold(` PRQ Status for ${result.user}`));
	lines.push(` ${separator}`);

	const grouped = new Map<PRCategory, CategorizedPR[]>();
	for (const pr of result.prs) {
		const list = grouped.get(pr.category) ?? [];
		list.push(pr);
		grouped.set(pr.category, list);
	}

	let hasContent = false;

	for (const category of CATEGORY_ORDER) {
		const prs = grouped.get(category);
		if (!prs || prs.length === 0) continue;

		hasContent = true;
		const config = CATEGORY_CONFIG[category];
		lines.push("");
		lines.push(
			` ${config.color(`${config.icon} ${config.label}`)} ${chalk.dim(`(${prs.length})`)}`,
		);

		for (const pr of prs) {
			lines.push(formatPR(pr));
		}
	}

	if (!hasContent) {
		lines.push("");
		lines.push(chalk.green("  All clear! No PRs need your attention."));
	}

	lines.push("");
	lines.push(` ${separator}`);

	const actionable = result.prs.filter((pr) => pr.category !== "open");
	const total = actionable.length;
	const repos = new Set(actionable.map((pr) => pr.repo)).size;
	if (total > 0) {
		lines.push(
			chalk.dim(
				` ${total} PR${total === 1 ? "" : "s"} need attention across ${repos} repo${repos === 1 ? "" : "s"}`,
			),
		);
	}

	lines.push("");
	return lines.join("\n");
}
