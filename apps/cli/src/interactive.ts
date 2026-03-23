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

function render(state: RenderState) {
	const { result, selectedIndex, message, actionMenu } = state;
	const termHeight = process.stdout.rows || 24;

	// Clear screen and move cursor to top
	process.stdout.write("\x1B[2J\x1B[H");

	const lines: string[] = [];

	// --- Top bar (shortcuts or action menu) ---
	if (actionMenu) {
		const pr = result.prs[selectedIndex];
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
		lines.push(
			` ${chalk.dim("↑↓")} navigate  ${chalk.dim("←→")} page  ${chalk.white("r")} review  ${chalk.white("o")} open  ${chalk.white("n")} nudge  ${chalk.white("s")} ${sLabel}  ${chalk.white("c")} copy  ${chalk.white("a")} actions  ${chalk.white("q")} quit`,
		);
	}

	if (message) {
		lines.push(` ${message}`);
	}

	lines.push("");
	lines.push(chalk.bold(` PRQ Status for ${result.user}`));
	lines.push(chalk.dim(` ${"─".repeat(50)}`));

	// --- Compute how many PRs fit ---
	const headerUsed = lines.length;
	const footerLines = 2; // blank + separator
	const maxBodyLines = Math.max(4, termHeight - headerUsed - footerLines);
	const maxPRs = Math.floor(maxBodyLines / 2); // each PR = 2 lines

	// Ensure selected PR is in view window
	if (selectedIndex < state.viewStart) {
		state.viewStart = selectedIndex;
	}
	if (selectedIndex >= state.viewStart + maxPRs) {
		state.viewStart = selectedIndex - maxPRs + 1;
	}
	state.viewStart = Math.max(
		0,
		Math.min(state.viewStart, result.prs.length - maxPRs),
	);

	const viewEnd = Math.min(result.prs.length, state.viewStart + maxPRs);

	// --- Build grouped structure with flat indices ---
	const grouped = new Map<
		PRCategory,
		{ pr: CategorizedPR; flatIdx: number }[]
	>();
	for (let i = 0; i < result.prs.length; i++) {
		const pr = result.prs[i];
		const list = grouped.get(pr.category) ?? [];
		list.push({ pr, flatIdx: i });
		grouped.set(pr.category, list);
	}

	// --- Render only PRs in the visible window ---
	let lastCategory: PRCategory | null = null;

	for (let flatIdx = state.viewStart; flatIdx < viewEnd; flatIdx++) {
		const pr = result.prs[flatIdx];
		const isSelected = flatIdx === selectedIndex;

		// Show category header when category changes
		if (pr.category !== lastCategory) {
			const catConfig = CATEGORY_CONFIG[pr.category];
			const catPrs = grouped.get(pr.category) ?? [];
			lines.push("");
			lines.push(
				` ${catConfig.color(`${catConfig.icon} ${catConfig.label}`)} ${chalk.dim(`(${catPrs.length})`)}`,
			);
			lastCategory = pr.category;
		}

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
	}

	if (result.prs.length === 0) {
		lines.push("");
		lines.push(chalk.green("  All clear! No PRs need your attention."));
	}

	// Scroll indicator
	if (result.prs.length > maxPRs) {
		lines.push("");
		lines.push(
			chalk.dim(
				` showing ${state.viewStart + 1}-${viewEnd} of ${result.prs.length} PRs`,
			),
		);
	}

	lines.push("");
	lines.push(chalk.dim(` ${"─".repeat(50)}`));

	process.stdout.write(lines.join("\n"));
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
