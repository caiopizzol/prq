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

	process.stdout.write("\x1B[2J\x1B[H");

	const lines: string[] = [];

	lines.push(chalk.bold(` PRQ Status for ${result.user}`));
	lines.push(chalk.dim(` ${"─".repeat(50)}`));

	// How many PRs fit (each PR = 2 lines title+detail, selected = 3 lines with shortcuts)
	const headerLines = lines.length;
	const footerLines = 3; // blank + indicator + separator
	const maxBodyLines = Math.max(6, termHeight - headerLines - footerLines);
	const maxPRs = Math.floor(maxBodyLines / 3); // worst case: selected PR takes 3 lines

	// Keep selected PR in view
	if (selectedIndex < state.viewStart) {
		state.viewStart = selectedIndex;
	}
	if (selectedIndex >= state.viewStart + maxPRs) {
		state.viewStart = selectedIndex - maxPRs + 1;
	}
	state.viewStart = Math.max(
		0,
		Math.min(state.viewStart, Math.max(0, result.prs.length - maxPRs)),
	);

	const viewEnd = Math.min(result.prs.length, state.viewStart + maxPRs);

	// Group PRs for category counts
	const categoryCounts = new Map<PRCategory, number>();
	for (const pr of result.prs) {
		categoryCounts.set(pr.category, (categoryCounts.get(pr.category) ?? 0) + 1);
	}

	// Render visible PRs
	let lastCategory: PRCategory | null = null;

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

			// Inline shortcuts or action menu
			if (actionMenu) {
				for (let j = 0; j < actionMenu.length; j++) {
					lines.push(
						`     ${chalk.white(String(j + 1))}. ${actionMenu[j].name}`,
					);
				}
				lines.push(`     ${chalk.dim("1-9")} run  ${chalk.white("q")} back`);
			} else {
				const sLabel = pr.category === "in-progress" ? "stop" : "start";
				lines.push(
					chalk.dim(
						`     r review  o open  n nudge  s ${sLabel}  c copy  a actions  q quit`,
					),
				);
			}
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

	// Scroll indicator + navigation hint
	lines.push("");
	if (result.prs.length > maxPRs) {
		lines.push(
			chalk.dim(
				` ${state.viewStart + 1}-${viewEnd} of ${result.prs.length}  ↑↓ navigate  ←→ page`,
			),
		);
	} else {
		lines.push(chalk.dim(` ${result.prs.length} PRs  ↑↓ navigate`));
	}

	if (message) {
		lines.push(` ${message}`);
	}

	process.stdout.write(lines.join("\n"));
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
