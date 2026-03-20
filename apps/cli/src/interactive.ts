import chalk from "chalk";
import {
	buildContext,
	executeCommand,
	getAction,
	interpolate,
} from "./actions.js";
import type { Config } from "./config.js";
import type { ResolvedPR } from "./identifier.js";
import type { CategorizedPR, PRCategory, StatusResult } from "./types.js";

const CATEGORY_CONFIG: Record<
	PRCategory,
	{ icon: string; label: string; color: (s: string) => string }
> = {
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
};

const CATEGORY_ORDER: PRCategory[] = [
	"needs-re-review",
	"requested",
	"stale",
	"waiting-on-others",
];

function toResolvedPR(pr: CategorizedPR): ResolvedPR {
	const [owner, repo] = pr.repo.split("/");
	return {
		owner,
		repo,
		number: pr.number,
		url: pr.url,
		title: pr.title,
		author: pr.author,
		updatedAt: pr.updatedAt,
	};
}

function render(result: StatusResult, selectedIndex: number, message: string) {
	// Clear screen and move cursor to top
	process.stdout.write("\x1B[2J\x1B[H");

	const lines: string[] = [];

	lines.push(chalk.bold(` PRQ Status for ${result.user}`));
	lines.push(chalk.dim(` ${"─".repeat(50)}`));

	const grouped = new Map<PRCategory, CategorizedPR[]>();
	for (const pr of result.prs) {
		const list = grouped.get(pr.category) ?? [];
		list.push(pr);
		grouped.set(pr.category, list);
	}

	let flatIndex = 0;

	for (const category of CATEGORY_ORDER) {
		const prs = grouped.get(category);
		if (!prs || prs.length === 0) continue;

		const config = CATEGORY_CONFIG[category];
		lines.push("");
		lines.push(
			` ${config.color(`${config.icon} ${config.label}`)} ${chalk.dim(`(${prs.length})`)}`,
		);

		for (const pr of prs) {
			const isSelected = flatIndex === selectedIndex;
			const arrow = isSelected ? chalk.yellow("›") : " ";
			const draft = pr.isDraft ? chalk.dim(" [draft]") : "";
			const maxTitle = 50;
			const title =
				pr.title.length > maxTitle
					? `${pr.title.slice(0, maxTitle - 3)}...`
					: pr.title;

			if (isSelected) {
				const ref = chalk.white(`#${pr.number}`);
				lines.push(` ${arrow} ${ref}  ${chalk.white(title)}${draft}`);
				lines.push(`     ${chalk.dim("↳")} ${chalk.dim(pr.detail)}`);
			} else {
				const ref = chalk.dim(`#${pr.number}`);
				lines.push(` ${arrow} ${ref}  ${chalk.dim(title)}${draft}`);
				lines.push(`     ${chalk.dim("↳")} ${chalk.dim(pr.detail)}`);
			}

			flatIndex++;
		}
	}

	if (result.prs.length === 0) {
		lines.push("");
		lines.push(chalk.green("  All clear! No PRs need your attention."));
	}

	lines.push("");
	lines.push(chalk.dim(` ${"─".repeat(50)}`));

	// Action bar
	lines.push("");
	lines.push(
		` ${chalk.dim("↑↓")} navigate  ${chalk.white("r")} review  ${chalk.white("o")} open  ${chalk.white("n")} nudge  ${chalk.white("c")} copy url  ${chalk.white("q")} quit`,
	);

	// Message line
	if (message) {
		lines.push("");
		lines.push(` ${message}`);
	}

	process.stdout.write(lines.join("\n"));
}

export async function interactiveMode(
	result: StatusResult,
	config: Config,
): Promise<void> {
	if (result.prs.length === 0) {
		console.log(chalk.green("\n  All clear! No PRs need your attention.\n"));
		return;
	}

	let selectedIndex = 0;
	let message = "";
	const total = result.prs.length;

	// Enable raw mode for keypress capture
	if (!process.stdin.isTTY) {
		// Not a TTY — fall back to non-interactive
		process.stdout.write(
			"Interactive mode requires a terminal. Use prq status instead.\n",
		);
		return;
	}

	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.setEncoding("utf8");

	// Hide cursor
	process.stdout.write("\x1B[?25l");

	render(result, selectedIndex, message);

	return new Promise((resolve) => {
		const cleanup = () => {
			process.stdin.setRawMode(false);
			process.stdin.pause();
			process.stdin.removeAllListeners("data");
			// Show cursor and clear screen
			process.stdout.write("\x1B[?25h\x1B[2J\x1B[H");
		};

		process.stdin.on("data", async (key: string) => {
			const pr = result.prs[selectedIndex];

			switch (key) {
				// Quit
				case "q":
				case "\x03": // Ctrl+C
					cleanup();
					resolve();
					return;

				// Navigate
				case "\x1B[A": // Up arrow
					selectedIndex = Math.max(0, selectedIndex - 1);
					message = "";
					break;
				case "\x1B[B": // Down arrow
					selectedIndex = Math.min(total - 1, selectedIndex + 1);
					message = "";
					break;

				// Actions
				case "o": {
					const template = getAction("open", config);
					if (template) {
						const cmd = interpolate(template, buildContext(toResolvedPR(pr)));
						message = chalk.dim(`opening ${pr.repo}#${pr.number}...`);
						render(result, selectedIndex, message);
						try {
							await executeCommand(cmd);
							message = chalk.green(`opened ${pr.repo}#${pr.number}`);
						} catch {
							message = chalk.red("failed to open");
						}
					}
					break;
				}
				case "r": {
					const template = getAction("review", config);
					if (template) {
						const cmd = interpolate(template, buildContext(toResolvedPR(pr)));
						message = chalk.dim(
							`opening review for ${pr.repo}#${pr.number}...`,
						);
						render(result, selectedIndex, message);
						try {
							await executeCommand(cmd);
							message = chalk.green(
								`opened review for ${pr.repo}#${pr.number}`,
							);
						} catch {
							message = chalk.red("failed to open review");
						}
					}
					break;
				}
				case "n": {
					const template = getAction("nudge", config);
					if (template) {
						const cmd = interpolate(template, buildContext(toResolvedPR(pr)));
						message = chalk.dim(`nudging ${pr.repo}#${pr.number}...`);
						render(result, selectedIndex, message);
						try {
							await executeCommand(cmd);
							message = chalk.green(`nudged ${pr.repo}#${pr.number}`);
						} catch {
							message = chalk.red("failed to nudge");
						}
					}
					break;
				}
				case "c": {
					// Copy URL to clipboard
					const url = pr.url;
					try {
						const proc =
							process.platform === "darwin"
								? "pbcopy"
								: process.platform === "linux"
									? "xclip -selection clipboard"
									: "clip";
						await executeCommand(`echo "${url}" | ${proc}`);
						message = chalk.green("url copied");
					} catch {
						message = chalk.dim(url);
					}
					break;
				}
				default:
					break;
			}

			render(result, selectedIndex, message);
		});
	});
}
