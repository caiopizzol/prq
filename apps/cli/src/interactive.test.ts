import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
	findMatch,
	handleSearchKey,
	recomputeState,
	type SearchState,
} from "./interactive.js";
import { markNudged, toggleInProgress } from "./state.js";
import type { CategorizedItem, StatusResult } from "./types.js";

function makeItem(overrides: Partial<CategorizedItem> = {}): CategorizedItem {
	return {
		type: "pr",
		category: "requested",
		repo: "org/repo",
		number: 1,
		title: "test pr",
		author: "alice",
		url: "https://github.com/org/repo/pull/1",
		isDraft: false,
		updatedAt: new Date().toISOString(),
		detail: "requested 1d ago",
		labels: [],
		...overrides,
	};
}

const items: CategorizedItem[] = [
	makeItem({ number: 100, title: "fix: arrow key nav", author: "alice" }),
	makeItem({ number: 2352, title: "feat: column separators", author: "bob" }),
	makeItem({ number: 482, title: "refactor: extract utils", author: "carol" }),
	makeItem({ number: 99, title: "chore: bump deps", author: "alice" }),
];

function makeSearchState(overrides: Partial<SearchState> = {}): SearchState {
	return {
		searchMode: true,
		searchBuffer: "",
		selectedIndex: 0,
		preSearchIndex: 0,
		message: "",
		...overrides,
	};
}

describe("findMatch", () => {
	test("exact PR number match", () => {
		expect(findMatch(items, "482")).toBe(2);
		expect(findMatch(items, "2352")).toBe(1);
		expect(findMatch(items, "100")).toBe(0);
	});

	test("PR number with # prefix", () => {
		expect(findMatch(items, "#482")).toBe(2);
		expect(findMatch(items, "#2352")).toBe(1);
	});

	test("partial number substring match", () => {
		expect(findMatch(items, "23")).toBe(1);
	});

	test("title substring match", () => {
		expect(findMatch(items, "arrow")).toBe(0);
		expect(findMatch(items, "separators")).toBe(1);
		expect(findMatch(items, "extract")).toBe(2);
	});

	test("title match is case-insensitive", () => {
		expect(findMatch(items, "Arrow")).toBe(0);
		expect(findMatch(items, "REFACTOR")).toBe(2);
	});

	test("author match", () => {
		expect(findMatch(items, "bob")).toBe(1);
		expect(findMatch(items, "carol")).toBe(2);
	});

	test("author match is case-insensitive", () => {
		expect(findMatch(items, "Bob")).toBe(1);
	});

	test("returns first match when multiple items match", () => {
		expect(findMatch(items, "alice")).toBe(0);
	});

	test("returns -1 for empty query", () => {
		expect(findMatch(items, "")).toBe(-1);
	});

	test("returns -1 when nothing matches", () => {
		expect(findMatch(items, "zzz")).toBe(-1);
		expect(findMatch(items, "9999")).toBe(-1);
	});

	test("exact number takes priority over substring", () => {
		expect(findMatch(items, "99")).toBe(3);
	});

	test("works with empty item list", () => {
		expect(findMatch([], "482")).toBe(-1);
	});
});

describe("handleSearchKey", () => {
	test("typing a character appends to buffer and jumps to match", () => {
		const state = makeSearchState();
		handleSearchKey(state, "b", items);
		expect(state.searchBuffer).toBe("b");
		expect(state.selectedIndex).toBe(1); // "bob" is author of index 1
		expect(state.searchMode).toBe(true);
	});

	test("typing multiple characters accumulates buffer", () => {
		const state = makeSearchState();
		handleSearchKey(state, "4", items);
		handleSearchKey(state, "8", items);
		handleSearchKey(state, "2", items);
		expect(state.searchBuffer).toBe("482");
		expect(state.selectedIndex).toBe(2); // PR #482
	});

	test("enter confirms and exits search mode", () => {
		const state = makeSearchState({
			searchBuffer: "482",
			selectedIndex: 2,
			preSearchIndex: 0,
		});
		handleSearchKey(state, "\r", items);
		expect(state.searchMode).toBe(false);
		expect(state.searchBuffer).toBe("");
		expect(state.selectedIndex).toBe(2); // stays at matched position
	});

	test("escape cancels and restores original position", () => {
		const state = makeSearchState({
			searchBuffer: "482",
			selectedIndex: 2,
			preSearchIndex: 0,
		});
		handleSearchKey(state, "\x1B", items);
		expect(state.searchMode).toBe(false);
		expect(state.searchBuffer).toBe("");
		expect(state.selectedIndex).toBe(0); // restored to preSearchIndex
	});

	test("ctrl+c cancels and restores original position", () => {
		const state = makeSearchState({
			searchBuffer: "bob",
			selectedIndex: 1,
			preSearchIndex: 3,
		});
		handleSearchKey(state, "\x03", items);
		expect(state.searchMode).toBe(false);
		expect(state.selectedIndex).toBe(3);
	});

	test("backspace removes last character and re-searches", () => {
		const state = makeSearchState({
			searchBuffer: "bo",
			selectedIndex: 1,
		});
		handleSearchKey(state, "\x7F", items);
		expect(state.searchBuffer).toBe("b");
		expect(state.selectedIndex).toBe(1); // "b" still matches "bob" at index 1
		expect(state.searchMode).toBe(true);
	});

	test("backspace to empty buffer restores original position", () => {
		const state = makeSearchState({
			searchBuffer: "b",
			selectedIndex: 1,
			preSearchIndex: 3,
		});
		handleSearchKey(state, "\x7F", items);
		expect(state.searchBuffer).toBe("");
		expect(state.selectedIndex).toBe(3); // restored to preSearchIndex
		expect(state.searchMode).toBe(true); // still in search mode
	});

	test("no match sets message", () => {
		const state = makeSearchState();
		handleSearchKey(state, "z", items);
		handleSearchKey(state, "z", items);
		handleSearchKey(state, "z", items);
		expect(state.searchBuffer).toBe("zzz");
		expect(state.message).toBe("no match");
		expect(state.searchMode).toBe(true);
	});

	test("no match does not change selectedIndex", () => {
		const state = makeSearchState({ selectedIndex: 2 });
		handleSearchKey(state, "z", items);
		expect(state.selectedIndex).toBe(2);
	});

	test("ignores non-printable characters", () => {
		const state = makeSearchState({ selectedIndex: 0 });
		handleSearchKey(state, "\x01", items); // Ctrl+A
		expect(state.searchBuffer).toBe("");
		expect(state.selectedIndex).toBe(0);
	});
});

const STATE_DIR = path.join(process.env.HOME ?? "", ".config", "prq");
const STATE_PATH = path.join(STATE_DIR, "state.json");

function makeResult(items: CategorizedItem[], user = "me"): StatusResult {
	return { user, timestamp: new Date().toISOString(), items };
}

describe("recomputeState", () => {
	afterEach(() => {
		try {
			fs.unlinkSync(STATE_PATH);
		} catch {}
	});

	test("moves nudged item to nudged category after markNudged", () => {
		const staleItem = makeItem({
			number: 42,
			category: "stale",
			detail: "No activity for 5 days",
		});
		const requestedItem = makeItem({
			number: 10,
			category: "requested",
			detail: "Requested 1d ago",
		});
		const sourceItems = [staleItem, requestedItem];

		const state = {
			result: makeResult([staleItem, requestedItem]),
			sourceItems,
			selectedIndex: 0,
		};

		// Simulate what the action hook does after a successful nudge
		markNudged({ repo: "org/repo", number: 42 });
		recomputeState(state, staleItem);

		const nudgedItem = state.result.items.find((p) => p.number === 42);
		expect(nudgedItem).toBeDefined();
		expect(nudgedItem?.category).toBe("nudged");
		expect(nudgedItem?.detail).toMatch(/^Nudged /);
	});

	test("moves in-progress item to in-progress category after toggle", () => {
		const staleItem = makeItem({
			number: 42,
			category: "stale",
			detail: "No activity for 5 days",
		});
		const sourceItems = [staleItem];

		const state = {
			result: makeResult([staleItem]),
			sourceItems,
			selectedIndex: 0,
		};

		toggleInProgress(staleItem);
		recomputeState(state, staleItem);

		expect(state.result.items[0].category).toBe("in-progress");
	});

	test("selectedIndex follows target item to new position", () => {
		// Order: in-progress comes before stale in category sort
		const staleItem = makeItem({
			number: 42,
			repo: "org/repo",
			category: "stale",
		});
		const requestedItem = makeItem({
			number: 10,
			repo: "org/repo",
			category: "requested",
		});
		// Source order: requested (idx 0), stale (idx 1)
		const sourceItems = [requestedItem, staleItem];

		const state = {
			result: makeResult(sourceItems),
			sourceItems,
			selectedIndex: 1, // pointing at staleItem
		};

		// Mark staleItem as nudged — it should move to the nudged category
		markNudged({ repo: "org/repo", number: 42 });
		recomputeState(state, staleItem);

		// selectedIndex should follow item #42 to its new position
		const newItem = state.result.items[state.selectedIndex];
		expect(newItem.number).toBe(42);
	});

	test("selectedIndex clamped when target item disappears", () => {
		const item1 = makeItem({ number: 1 });
		const item2 = makeItem({ number: 2 });
		const sourceItems = [item1, item2];

		const state = {
			result: makeResult(sourceItems),
			sourceItems,
			selectedIndex: 5, // out of range
		};

		// Target item not in list — selectedIndex should clamp
		recomputeState(state, { repo: "org/gone", number: 999 });
		expect(state.selectedIndex).toBeLessThan(state.result.items.length);
	});
});
