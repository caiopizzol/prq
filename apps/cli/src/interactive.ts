import chalk from "chalk";
import {
	buildContext,
	executeCommand,
	interpolate,
	listActions,
	runActionWithHooks,
} from "./actions.js";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "./categories.js";
import type { Config } from "./config.js";
import type { ResolvedPR } from "./identifier.js";
import { applyInProgress, applyNudged, toggleInProgress } from "./state.js";
import type { CategorizedPR, PRCategory, StatusResult } from "./types.js";

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
	scrollOffset: number;
}

function buildLines(state: RenderState): {
	lines: string[];
	selectedLineStart: number;
	selectedLineEnd: number;
} {
	const { result, selectedIndex, message, actionMenu } = state;

	const lines: string[] = [];
	let selectedLineStart = -1;
	let selectedLineEnd = -1;

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

			if (isSelected) selectedLineStart = lines.length;

			if (isSelected) {
				const ref = chalk.white(`#${pr.number}`);
				lines.push(` ${arrow} ${ref}  ${chalk.white(title)}${draft}`);
				lines.push(`     ${chalk.dim("↳")} ${chalk.dim(pr.detail)}`);
			} else {
				const ref = chalk.dim(`#${pr.number}`);
				lines.push(` ${arrow} ${ref}  ${chalk.dim(title)}${draft}`);
				lines.push(`     ${chalk.dim("↳")} ${chalk.dim(pr.detail)}`);
			}

			if (isSelected) selectedLineEnd = lines.length - 1;

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
		const pr = result.prs[selectedIndex];
		const sLabel = pr?.category === "in-progress" ? "stop" : "start";
		lines.push("");
		lines.push(
			` ${chalk.dim("↑↓")} navigate  ${chalk.dim("←→")} page  ${chalk.white("r")} review  ${chalk.white("o")} open  ${chalk.white("n")} nudge  ${chalk.white("s")} ${sLabel}  ${chalk.white("c")} copy url  ${chalk.white("a")} actions  ${chalk.white("q")} quit`,
		);
	}

	if (message) {
		lines.push("");
		lines.push(` ${message}`);
	}

	return { lines, selectedLineStart, selectedLineEnd };
}

function render(state: RenderState) {
	const termHeight = process.stdout.rows || 24;
	const { lines, selectedLineStart, selectedLineEnd } = buildLines(state);

	// If everything fits, no scrolling needed
	if (lines.length <= termHeight) {
		state.scrollOffset = 0;
	} else {
		// Ensure selected PR is visible with 1 line of padding
		const padding = 1;
		if (selectedLineStart - padding < state.scrollOffset) {
			state.scrollOffset = Math.max(0, selectedLineStart - padding);
		}
		if (selectedLineEnd + padding >= state.scrollOffset + termHeight) {
			state.scrollOffset = selectedLineEnd + padding - termHeight + 1;
		}
		// Clamp
		state.scrollOffset = Math.max(
			0,
			Math.min(state.scrollOffset, lines.length - termHeight),
		);
	}

	const visible = lines.slice(
		state.scrollOffset,
		state.scrollOffset + termHeight,
	);

	console.clear();
	process.stdout.write(visible.join("\n"));
}

function suspend() {
	process.stdin.setRawMode(false);
	process.stdin.pause();
	process.stdin.removeAllListeners("data");
	// Show cursor and clear screen
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

	// Suspend TUI so the command gets full terminal control
	suspend();
	process.stdout.write(
		chalk.dim(`\n  running ${actionName} on ${pr.repo}#${pr.number}...\n\n`),
	);

	try {
		await runActionWithHooks(actionName, cmd, context);
		// Resume TUI
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
		scrollOffset: 0,
	};

	// Enable raw mode for keypress capture
	if (!process.stdin.isTTY) {
		process.stdout.write(
			"Interactive mode requires a terminal. Use prq status instead.\n",
		);
		return;
	}

	return new Promise((resolve) => {
		const onData = async (key: string) => {
			const pr = result.prs[state.selectedIndex];

			// Action menu mode
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

			// Normal mode
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
					// Left arrow — page up
					state.selectedIndex = Math.max(
						0,
						state.selectedIndex - config.pageSize,
					);
					state.message = "";
					break;
				case "\x1B[C":
					// Right arrow — page down
					state.selectedIndex = Math.min(
						total - 1,
						state.selectedIndex + config.pageSize,
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
