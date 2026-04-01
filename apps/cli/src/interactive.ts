import chalk from "chalk";
import {
	buildContext,
	executeCommand,
	interpolate,
	listActions,
	runActionWithHooks,
} from "./actions.js";
import { CATEGORY_CONFIG, sortByCategory } from "./categories.js";
import type { Config } from "./config.js";
import { typePrefix } from "./format.js";
import type { ResolvedPR } from "./identifier.js";
import { applyInProgress, applyNudged, toggleInProgress } from "./state.js";
import type {
	CategorizedItem,
	ItemCategory,
	ItemType,
	StatusResult,
} from "./types.js";

const PAGE_SIZE = 10;

type TypeFilter = "all" | ItemType;

const FILTER_LABEL: Record<TypeFilter, string> = {
	all: "all",
	pr: "PRs",
	issue: "issues",
};

function toResolvedPR(item: CategorizedItem): ResolvedPR {
	const [owner, repo] = item.repo.split("/");
	return {
		owner,
		repo,
		number: item.number,
		url: item.url,
		title: item.title,
		author: item.author,
		updatedAt: item.updatedAt,
	};
}

interface RenderState {
	result: StatusResult;
	sourceItems: CategorizedItem[];
	selectedIndex: number;
	message: string;
	actionMenu: { name: string; template: string }[] | null;
	filterMenu: boolean;
	typeFilter: TypeFilter;
	viewStart: number;
	searchMode: boolean;
	searchBuffer: string;
	preSearchIndex: number;
}

function filteredItems(state: RenderState): CategorizedItem[] {
	if (state.typeFilter === "all") return state.result.items;
	return state.result.items.filter((i) => i.type === state.typeFilter);
}

/** Recompute categorized item list from source items and adjust selection to follow a target item. */
export function recomputeState(
	state: {
		result: StatusResult;
		sourceItems: CategorizedItem[];
		selectedIndex: number;
	},
	targetItem: { repo: string; number: number },
): void {
	state.result = {
		...state.result,
		items: sortByCategory(applyNudged(applyInProgress(state.sourceItems))),
	};
	const newIndex = state.result.items.findIndex(
		(p) => p.repo === targetItem.repo && p.number === targetItem.number,
	);
	state.selectedIndex =
		newIndex >= 0
			? newIndex
			: Math.min(
					state.selectedIndex,
					Math.max(0, state.result.items.length - 1),
				);
}

/**
 * Count how many output lines a range of items will produce,
 * including category headers when the category changes.
 */
function countLines(
	items: CategorizedItem[],
	from: number,
	to: number,
): number {
	let count = 0;
	let lastCat: ItemCategory | null = from > 0 ? null : null;

	// Look back to find the previous category for header logic
	if (from > 0) {
		lastCat = items[from - 1].category;
	}

	for (let i = from; i < to && i < items.length; i++) {
		if (items[i].category !== lastCat) {
			count += 2; // blank + category header
			lastCat = items[i].category;
		}
		count += 2; // title + detail
	}
	return count;
}

function render(state: RenderState) {
	const { selectedIndex, message, actionMenu, filterMenu } = state;
	const items = filteredItems(state);
	const termHeight = process.stdout.rows || 24;

	process.stdout.write("\x1B[2J\x1B[H");

	// Reserve: header(2) + blank(1) + shortcuts(1) + indicator(0-1) + message(0-1)
	const hasPages = items.length > 5; // will likely paginate
	const reservedTop = 2;
	const reservedBottom = 2 + (hasPages ? 1 : 0) + (message ? 1 : 0);
	const budget = termHeight - reservedTop - reservedBottom;

	// Adjust viewStart so selected item is visible and lines fit budget
	if (selectedIndex < state.viewStart) {
		state.viewStart = selectedIndex;
	}

	// Expand window from viewStart, counting lines until budget exceeded
	let end = state.viewStart;
	while (end < items.length) {
		if (countLines(items, state.viewStart, end + 1) > budget) break;
		end++;
	}

	// If selected item is not in [viewStart, end), shift viewStart forward
	if (selectedIndex >= end) {
		state.viewStart = selectedIndex;
		end = selectedIndex + 1;
		while (state.viewStart > 0) {
			if (countLines(items, state.viewStart - 1, end) > budget) break;
			state.viewStart--;
		}
		while (end < items.length) {
			if (countLines(items, state.viewStart, end + 1) > budget) break;
			end++;
		}
	}

	const viewEnd = end;

	// --- Build output ---
	const lines: string[] = [];

	// Header
	lines.push(chalk.bold(` PRQ Status for ${state.result.user}`));
	lines.push(chalk.dim(` ${"─".repeat(50)}`));

	// Category counts
	const categoryCounts = new Map<ItemCategory, number>();
	for (const item of items) {
		categoryCounts.set(
			item.category,
			(categoryCounts.get(item.category) ?? 0) + 1,
		);
	}

	// Items
	let lastCategory: ItemCategory | null =
		state.viewStart > 0 ? items[state.viewStart - 1].category : null;

	for (let i = state.viewStart; i < viewEnd; i++) {
		const item = items[i];
		const isSelected = i === selectedIndex;

		if (item.category !== lastCategory) {
			const cfg = CATEGORY_CONFIG[item.category];
			const count = categoryCounts.get(item.category) ?? 0;
			lines.push("");
			lines.push(
				` ${cfg.color(`${cfg.icon} ${cfg.label}`)} ${chalk.dim(`(${count})`)}`,
			);
			lastCategory = item.category;
		}

		const arrow = isSelected ? chalk.yellow("›") : " ";
		const draft = item.isDraft ? chalk.dim(" [draft]") : "";
		const title =
			item.title.length > 50 ? `${item.title.slice(0, 47)}...` : item.title;
		const prefix = typePrefix(item, isSelected);

		const author = chalk.dim(`@${item.author}`);

		const detail = `${author} ${chalk.dim("·")} ${chalk.dim(item.detail)}`;

		if (isSelected) {
			lines.push(
				` ${arrow} ${prefix} ${chalk.white(`#${item.number}`)}  ${chalk.white(title)}${draft}`,
			);
			lines.push(`        ${chalk.dim("↳")} ${detail}`);
		} else {
			lines.push(
				` ${arrow} ${prefix} ${chalk.dim(`#${item.number}`)}  ${chalk.dim(title)}${draft}`,
			);
			lines.push(`        ${chalk.dim("↳")} ${detail}`);
		}
	}

	if (items.length === 0) {
		lines.push("");
		lines.push(chalk.green("  All clear! Nothing needs your attention."));
	}

	// Footer
	lines.push("");
	if (state.searchMode) {
		lines.push(` ${chalk.yellow("/")}${state.searchBuffer}${chalk.dim("▏")}`);
	} else if (filterMenu) {
		lines.push(
			` ${chalk.bold("Filter:")}  ${chalk.white("a")} all  ${chalk.white("p")} PRs  ${chalk.white("i")} issues  ${chalk.white("q")} back`,
		);
	} else if (actionMenu) {
		const item = items[selectedIndex];
		lines.push(
			` ${chalk.bold("Actions")} for ${chalk.white(`#${item.number}`)}:  ${actionMenu.map((a, j) => `${chalk.white(String(j + 1))} ${a.name}`).join("  ")}  ${chalk.white("q")} back`,
		);
	} else {
		const item = items[selectedIndex];
		const sLabel = item?.category === "in-progress" ? "stop" : "start";
		const filterLabel = FILTER_LABEL[state.typeFilter];
		lines.push(
			` ${chalk.dim("/")} search  ${chalk.dim("o")} open  ${chalk.dim("n")} nudge  ${chalk.dim("s")} ${sLabel}  ${chalk.dim("c")} copy  ${chalk.dim("t")} ${filterLabel}  ${chalk.dim("a")} actions  ${chalk.dim("q")} quit`,
		);
	}
	if (items.length > viewEnd - state.viewStart) {
		lines.push(
			chalk.dim(
				` ${state.viewStart + 1}-${viewEnd} of ${items.length}  ↑↓ navigate  ←→ page`,
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

export function findMatch(items: CategorizedItem[], query: string): number {
	if (!query) return -1;
	const q = query.toLowerCase();

	// Exact number match first
	const num = parseInt(q.replace(/^#/, ""), 10);
	if (!Number.isNaN(num)) {
		const idx = items.findIndex((item) => item.number === num);
		if (idx !== -1) return idx;
	}

	// Substring match on number, title, or author
	return items.findIndex(
		(item) =>
			String(item.number).includes(q) ||
			item.title.toLowerCase().includes(q) ||
			item.author.toLowerCase().includes(q),
	);
}

export interface SearchState {
	searchMode: boolean;
	searchBuffer: string;
	selectedIndex: number;
	preSearchIndex: number;
	message: string;
}

export function handleSearchKey(
	state: SearchState,
	key: string,
	items: CategorizedItem[],
): void {
	const applySearch = () => {
		const match = findMatch(items, state.searchBuffer);
		if (match !== -1) {
			state.selectedIndex = match;
			state.message = "";
		} else {
			state.message = "no match";
		}
	};

	if (key === "\r") {
		state.searchMode = false;
		state.searchBuffer = "";
		state.message = "";
	} else if (key === "\x1B" || key === "\x03") {
		state.searchMode = false;
		state.searchBuffer = "";
		state.selectedIndex = state.preSearchIndex;
		state.message = "";
	} else if (key === "\x7F" || key === "\b") {
		state.searchBuffer = state.searchBuffer.slice(0, -1);
		if (state.searchBuffer) {
			applySearch();
		} else {
			state.selectedIndex = state.preSearchIndex;
			state.message = "";
		}
	} else if (key.length === 1 && key >= " ") {
		state.searchBuffer += key;
		applySearch();
	}
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
	item: CategorizedItem,
	state: RenderState,
	onData: (key: string) => void,
): Promise<{ message: string; ok: boolean }> {
	const context = buildContext(toResolvedPR(item), item.category, item.detail);
	const cmd = interpolate(template, context);

	suspend();
	process.stdout.write(
		chalk.dim(
			`\n  running ${actionName} on ${item.repo}#${item.number}...\n\n`,
		),
	);

	try {
		await runActionWithHooks(actionName, cmd, context);
		resume(state, onData);
		return {
			message: chalk.green(`${actionName}: ${item.repo}#${item.number}`),
			ok: true,
		};
	} catch {
		resume(state, onData);
		return { message: chalk.red(`${actionName} failed`), ok: false };
	}
}

export async function interactiveMode(
	result: StatusResult,
	sourceItems: CategorizedItem[],
	config: Config,
): Promise<void> {
	if (result.items.length === 0) {
		console.log(chalk.green("\n  All clear! Nothing needs your attention.\n"));
		return;
	}

	const allActions = listActions(config);

	const state: RenderState = {
		result,
		sourceItems,
		selectedIndex: 0,
		message: "",
		actionMenu: null,
		filterMenu: false,
		typeFilter: "all",
		viewStart: 0,
		searchMode: false,
		searchBuffer: "",
		preSearchIndex: 0,
	};

	if (!process.stdin.isTTY) {
		process.stdout.write(
			"Interactive mode requires a terminal. Use prq status instead.\n",
		);
		return;
	}

	return new Promise((resolve) => {
		const onData = async (key: string) => {
			const items = filteredItems(state);
			// Clamp selectedIndex to filtered list bounds (e.g., after recomputeState with active filter)
			if (items.length > 0 && state.selectedIndex >= items.length) {
				state.selectedIndex = items.length - 1;
			}
			const item = items[state.selectedIndex];

			if (state.searchMode) {
				handleSearchKey(state, key, items);
				render(state);
				return;
			}

			if (state.filterMenu) {
				const applyFilter = (filter: TypeFilter) => {
					state.typeFilter = filter;
					state.filterMenu = false;
					state.selectedIndex = 0;
					state.viewStart = 0;
					state.message = "";
				};
				if (key === "a") {
					applyFilter("all");
				} else if (key === "p") {
					applyFilter("pr");
				} else if (key === "i") {
					applyFilter("issue");
				} else if (key === "q" || key === "\x1B" || key === "t") {
					state.filterMenu = false;
					state.message = "";
				} else if (key === "\x03") {
					suspend();
					resolve();
					return;
				}
				render(state);
				return;
			}

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
						const result = await runAction(
							action.name,
							action.template,
							item,
							state,
							onData,
						);
						state.message = result.message;
						state.actionMenu = null;
						if (action.name === "nudge" && result.ok) {
							recomputeState(state, item);
						}
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
					state.selectedIndex = Math.min(
						items.length - 1,
						state.selectedIndex + 1,
					);
					state.message = "";
					break;
				case "\x1B[D":
					state.selectedIndex = Math.max(0, state.selectedIndex - PAGE_SIZE);
					state.message = "";
					break;
				case "\x1B[C":
					state.selectedIndex = Math.min(
						items.length - 1,
						state.selectedIndex + PAGE_SIZE,
					);
					state.message = "";
					break;

				case "o": {
					const template = allActions.open;
					if (template) {
						state.message = (
							await runAction("open", template, item, state, onData)
						).message;
					}
					break;
				}
				case "n": {
					const template = allActions.nudge;
					if (!template) break;
					const isOwnPR = item.author === state.result.user;
					const hasReviewers = /@\w/.test(item.detail);
					if (isOwnPR && !hasReviewers) {
						state.message = chalk.yellow("no reviewers to nudge");
						break;
					}
					const nudgeResult = await runAction(
						"nudge",
						template,
						item,
						state,
						onData,
					);
					state.message = nudgeResult.message;
					if (nudgeResult.ok) {
						recomputeState(state, item);
					}
					break;
				}
				case "c": {
					const url = item.url;
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
					const started = toggleInProgress(item);
					recomputeState(state, item);
					state.message = started
						? chalk.cyan(`started: ${item.repo}#${item.number}`)
						: chalk.dim(`unmarked: ${item.repo}#${item.number}`);
					break;
				}
				case "t": {
					state.filterMenu = true;
					state.message = "";
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
				case "/": {
					state.searchMode = true;
					state.searchBuffer = "";
					state.preSearchIndex = state.selectedIndex;
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
