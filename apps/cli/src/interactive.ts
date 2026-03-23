import chalk from "chalk";
import {
	buildContext,
	executeCommand,
	interpolate,
	listActions,
	runActionWithHooks,
} from "./actions.js";
import { CATEGORY_CONFIG } from "./categories.js";
import type { Config } from "./config.js";
import type { ResolvedPR } from "./identifier.js";
import { applyInProgress, applyNudged, toggleInProgress } from "./state.js";
import type { CategorizedPR, PRCategory, StatusResult } from "./types.js";

const PAGE_SIZE = 10;

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
	sourcePrs: CategorizedPR[];
	selectedIndex: number;
	message: string;
	actionMenu: { name: string; template: string }[] | null;
	viewStart: number;
}

/**
 * Count how many output lines a range of PRs will produce,
 * including category headers when the category changes.
 */
function countLines(prs: CategorizedPR[], from: number, to: number): number {
	let count = 0;
	let lastCat: PRCategory | null = from > 0 ? null : null;

	// Look back to find the previous category for header logic
	if (from > 0) {
		lastCat = prs[from - 1].category;
	}

	for (let i = from; i < to && i < prs.length; i++) {
		if (prs[i].category !== lastCat) {
			count += 2; // blank + category header
			lastCat = prs[i].category;
		}
		count += 2; // title + detail
	}
	return count;
}

function render(state: RenderState) {
	const { result, selectedIndex, message, actionMenu } = state;
	const termHeight = process.stdout.rows || 24;

	process.stdout.write("\x1B[2J\x1B[H");

	// Reserve: header(2) + blank(1) + shortcuts(1) + indicator(0-1) + message(0-1)
	const hasPages = result.prs.length > 5; // will likely paginate
	const reservedTop = 2;
	const reservedBottom = 2 + (hasPages ? 1 : 0) + (message ? 1 : 0);
	const budget = termHeight - reservedTop - reservedBottom;

	// Adjust viewStart so selected PR is visible and lines fit budget
	// First ensure selected is in range
	if (selectedIndex < state.viewStart) {
		state.viewStart = selectedIndex;
	}

	// Expand window from viewStart, counting lines until budget exceeded
	let end = state.viewStart;
	while (end < result.prs.length) {
		if (countLines(result.prs, state.viewStart, end + 1) > budget) break;
		end++;
	}

	// If selected PR is not in [viewStart, end), shift viewStart forward
	if (selectedIndex >= end) {
		state.viewStart = selectedIndex;
		end = selectedIndex + 1;
		while (state.viewStart > 0) {
			if (countLines(result.prs, state.viewStart - 1, end) > budget) break;
			state.viewStart--;
		}
		while (end < result.prs.length) {
			if (countLines(result.prs, state.viewStart, end + 1) > budget) break;
			end++;
		}
	}

	const viewEnd = end;

	// --- Build output ---
	const lines: string[] = [];

	// Header
	lines.push(chalk.bold(` PRQ Status for ${result.user}`));
	lines.push(chalk.dim(` ${"─".repeat(50)}`));

	// Category counts
	const categoryCounts = new Map<PRCategory, number>();
	for (const pr of result.prs) {
		categoryCounts.set(pr.category, (categoryCounts.get(pr.category) ?? 0) + 1);
	}

	// PRs
	let lastCategory: PRCategory | null =
		state.viewStart > 0 ? result.prs[state.viewStart - 1].category : null;

	for (let i = state.viewStart; i < viewEnd; i++) {
		const pr = result.prs[i];
		const isSelected = i === selectedIndex;

		if (pr.category !== lastCategory) {
			const cfg = CATEGORY_CONFIG[pr.category];
			const count = categoryCounts.get(pr.category) ?? 0;
			lines.push("");
			lines.push(
				` ${cfg.color(`${cfg.icon} ${cfg.label}`)} ${chalk.dim(`(${count})`)}`,
			);
			lastCategory = pr.category;
		}

		const arrow = isSelected ? chalk.yellow("›") : " ";
		const draft = pr.isDraft ? chalk.dim(" [draft]") : "";
		const title =
			pr.title.length > 50 ? `${pr.title.slice(0, 47)}...` : pr.title;

		if (isSelected) {
			lines.push(
				` ${arrow} ${chalk.white(`#${pr.number}`)}  ${chalk.white(title)}${draft}`,
			);
			lines.push(`     ${chalk.dim("↳")} ${chalk.dim(pr.detail)}`);
		} else {
			lines.push(
				` ${arrow} ${chalk.dim(`#${pr.number}`)}  ${chalk.dim(title)}${draft}`,
			);
			lines.push(`     ${chalk.dim("↳")} ${chalk.dim(pr.detail)}`);
		}
	}

	if (result.prs.length === 0) {
		lines.push("");
		lines.push(chalk.green("  All clear! No PRs need your attention."));
	}

	// Footer
	lines.push("");
	if (actionMenu) {
		const pr = result.prs[selectedIndex];
		lines.push(
			` ${chalk.bold("Actions")} for ${chalk.white(`#${pr.number}`)}:  ${actionMenu.map((a, j) => `${chalk.white(String(j + 1))} ${a.name}`).join("  ")}  ${chalk.white("q")} back`,
		);
	} else {
		const pr = result.prs[selectedIndex];
		const sLabel = pr?.category === "in-progress" ? "stop" : "start";
		lines.push(
			` ${chalk.dim("r")} review  ${chalk.dim("o")} open  ${chalk.dim("n")} nudge  ${chalk.dim("s")} ${sLabel}  ${chalk.dim("c")} copy  ${chalk.dim("a")} actions  ${chalk.dim("q")} quit`,
		);
	}
	if (result.prs.length > viewEnd - state.viewStart) {
		lines.push(
			chalk.dim(
				` ${state.viewStart + 1}-${viewEnd} of ${result.prs.length}  ↑↓ navigate  ←→ page`,
			),
		);
	}

	if (message) {
		lines.push(` ${message}`);
	}

	// Hard cap: never exceed terminal height
	const output = lines.slice(0, termHeight);
	process.stdout.write(output.join("\n"));
}

function suspend() {
	process.stdin.setRawMode(false);
	process.stdin.pause();
	process.stdin.removeAllListeners("data");
	process.stdout.write("\x1B[?25h\x1B[2J\x1B[H");
}

function resume(state: RenderState, onData: (key: string) => void) {
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.setEncoding("utf8");
	process.stdout.write("\x1B[?25l");
	process.stdin.on("data", onData);
	render(state);
}

async function runAction(
	actionName: string,
	template: string,
	pr: CategorizedPR,
	state: RenderState,
	onData: (key: string) => void,
): Promise<string> {
	const context = buildContext(toResolvedPR(pr), pr.category, pr.detail);
	const cmd = interpolate(template, context);

	suspend();
	process.stdout.write(
		chalk.dim(`\n  running ${actionName} on ${pr.repo}#${pr.number}...\n\n`),
	);

	try {
		await runActionWithHooks(actionName, cmd, context);
		resume(state, onData);
		return chalk.green(`${actionName}: ${pr.repo}#${pr.number}`);
	} catch {
		resume(state, onData);
		return chalk.red(`${actionName} failed`);
	}
}

export async function interactiveMode(
	result: StatusResult,
	sourcePrs: CategorizedPR[],
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
		sourcePrs,
		selectedIndex: 0,
		message: "",
		actionMenu: null,
		viewStart: 0,
	};

	if (!process.stdin.isTTY) {
		process.stdout.write(
			"Interactive mode requires a terminal. Use prq status instead.\n",
		);
		return;
	}

	return new Promise((resolve) => {
		const onData = async (key: string) => {
			const pr = result.prs[state.selectedIndex];

			if (state.actionMenu) {
				if (key === "q" || key === "\x1B" || key === "a") {
					state.actionMenu = null;
					state.message = "";
				} else if (key === "\x03") {
					suspend();
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
							onData,
						);
						state.actionMenu = null;
					}
				}
				render(state);
				return;
			}

			switch (key) {
				case "q":
				case "\x03":
					suspend();
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
				case "\x1B[D":
					state.selectedIndex = Math.max(0, state.selectedIndex - PAGE_SIZE);
					state.message = "";
					break;
				case "\x1B[C":
					state.selectedIndex = Math.min(
						total - 1,
						state.selectedIndex + PAGE_SIZE,
					);
					state.message = "";
					break;

				case "o": {
					const template = allActions.open;
					if (template) {
						state.message = await runAction(
							"open",
							template,
							pr,
							state,
							onData,
						);
					}
					break;
				}
				case "r": {
					const template = allActions.review;
					if (template) {
						state.message = await runAction(
							"review",
							template,
							pr,
							state,
							onData,
						);
					}
					break;
				}
				case "n": {
					const template = allActions.nudge;
					if (!template) break;
					const isOwnPR = pr.author === state.result.user;
					const hasReviewers = /@\w/.test(pr.detail);
					if (isOwnPR && !hasReviewers) {
						state.message = chalk.yellow("no reviewers to nudge");
						break;
					}
					state.message = await runAction("nudge", template, pr, state, onData);
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
				case "s": {
					const started = toggleInProgress(pr);
					state.result = {
						...state.result,
						prs: applyNudged(applyInProgress(state.sourcePrs)),
					};
					const newTotal = state.result.prs.length;
					if (state.selectedIndex >= newTotal) {
						state.selectedIndex = Math.max(0, newTotal - 1);
					}
					state.message = started
						? chalk.cyan(`started: ${pr.repo}#${pr.number}`)
						: chalk.dim(`unmarked: ${pr.repo}#${pr.number}`);
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
		};

		resume(state, onData);
	});
}
