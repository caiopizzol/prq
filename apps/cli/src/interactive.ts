import chalk from "chalk";
import {
	buildContext,
	executeCommand,
	interpolate,
	listActions,
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

interface RenderState {
	result: StatusResult;
	selectedIndex: number;
	message: string;
	actionMenu: { name: string; template: string }[] | null;
}

function render(state: RenderState) {
	const { result, selectedIndex, message, actionMenu } = state;

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

	if (actionMenu) {
		// Action menu overlay
		const pr = result.prs[selectedIndex];
		lines.push("");
		lines.push(` ${chalk.bold("Actions")} for ${chalk.white(`#${pr.number}`)}`);
		lines.push("");
		for (let i = 0; i < actionMenu.length; i++) {
			lines.push(`   ${chalk.white(String(i + 1))}. ${actionMenu[i].name}`);
		}
		lines.push("");
		lines.push(` ${chalk.dim("1-9")} run action  ${chalk.white("q")} back`);
	} else {
		// Normal action bar
		lines.push("");
		lines.push(
			` ${chalk.dim("↑↓")} navigate  ${chalk.white("r")} review  ${chalk.white("o")} open  ${chalk.white("n")} nudge  ${chalk.white("c")} copy url  ${chalk.white("a")} actions  ${chalk.white("q")} quit`,
		);
	}

	// Message line
	if (message) {
		lines.push("");
		lines.push(` ${message}`);
	}

	process.stdout.write(lines.join("\n"));
}

async function runAction(
	actionName: string,
	template: string,
	pr: CategorizedPR,
	state: RenderState,
): Promise<string> {
	const cmd = interpolate(template, buildContext(toResolvedPR(pr)));
	state.message = chalk.dim(
		`running ${actionName} on ${pr.repo}#${pr.number}...`,
	);
	render(state);
	try {
		await executeCommand(cmd);
		return chalk.green(`${actionName}: ${pr.repo}#${pr.number}`);
	} catch {
		return chalk.red(`${actionName} failed`);
	}
}

export async function interactiveMode(
	result: StatusResult,
	config: Config,
): Promise<void> {
	if (result.prs.length === 0) {
		console.log(chalk.green("\n  All clear! No PRs need your attention.\n"));
		return;
	}

	const total = result.prs.length;
	const allActions = listActions(config);

	const state: RenderState = {
		result,
		selectedIndex: 0,
		message: "",
		actionMenu: null,
	};

	// Enable raw mode for keypress capture
	if (!process.stdin.isTTY) {
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

	render(state);

	return new Promise((resolve) => {
		const cleanup = () => {
			process.stdin.setRawMode(false);
			process.stdin.pause();
			process.stdin.removeAllListeners("data");
			// Show cursor and clear screen
			process.stdout.write("\x1B[?25h\x1B[2J\x1B[H");
		};

		process.stdin.on("data", async (key: string) => {
			const pr = result.prs[state.selectedIndex];

			// Action menu mode
			if (state.actionMenu) {
				if (key === "q" || key === "\x1B" || key === "a") {
					state.actionMenu = null;
					state.message = "";
				} else if (key === "\x03") {
					cleanup();
					resolve();
					return;
				} else {
					const idx = parseInt(key, 10);
					if (idx >= 1 && idx <= state.actionMenu.length) {
						const action = state.actionMenu[idx - 1];
						state.message = await runAction(
							action.name,
							action.template,
							pr,
							state,
						);
						state.actionMenu = null;
					}
				}
				render(state);
				return;
			}

			// Normal mode
			switch (key) {
				case "q":
				case "\x03":
					cleanup();
					resolve();
					return;

				case "\x1B[A":
					state.selectedIndex = Math.max(0, state.selectedIndex - 1);
					state.message = "";
					break;
				case "\x1B[B":
					state.selectedIndex = Math.min(total - 1, state.selectedIndex + 1);
					state.message = "";
					break;

				case "o": {
					const template = allActions.open;
					if (template) {
						state.message = await runAction("open", template, pr, state);
					}
					break;
				}
				case "r": {
					const template = allActions.review;
					if (template) {
						state.message = await runAction("review", template, pr, state);
					}
					break;
				}
				case "n": {
					const template = allActions.nudge;
					if (template) {
						state.message = await runAction("nudge", template, pr, state);
					}
					break;
				}
				case "c": {
					const url = pr.url;
					try {
						const proc =
							process.platform === "darwin"
								? "pbcopy"
								: process.platform === "linux"
									? "xclip -selection clipboard"
									: "clip";
						await executeCommand(`echo "${url}" | ${proc}`);
						state.message = chalk.green("url copied");
					} catch {
						state.message = chalk.dim(url);
					}
					break;
				}
				case "a": {
					const entries = Object.entries(allActions);
					state.actionMenu = entries.map(([name, template]) => ({
						name,
						template,
					}));
					state.message = "";
					break;
				}
				default:
					break;
			}

			render(state);
		});
	});
}
