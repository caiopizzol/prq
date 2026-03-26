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
import type { CategorizedPR, StatusResult } from "./types.js";

function makePR(overrides: Partial<CategorizedPR> = {}): CategorizedPR {
	return {
		category: "requested",
		repo: "org/repo",
		number: 1,
		title: "test pr",
		author: "alice",
		url: "https://github.com/org/repo/pull/1",
		isDraft: false,
		updatedAt: new Date().toISOString(),
		detail: "requested 1d ago",
		...overrides,
	};
}

const prs: CategorizedPR[] = [
	makePR({ number: 100, title: "fix: arrow key nav", author: "alice" }),
	makePR({ number: 2352, title: "feat: column separators", author: "bob" }),
	makePR({ number: 482, title: "refactor: extract utils", author: "carol" }),
	makePR({ number: 99, title: "chore: bump deps", author: "alice" }),
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
		expect(findMatch(prs, "482")).toBe(2);
		expect(findMatch(prs, "2352")).toBe(1);
		expect(findMatch(prs, "100")).toBe(0);
	});

	test("PR number with # prefix", () => {
		expect(findMatch(prs, "#482")).toBe(2);
		expect(findMatch(prs, "#2352")).toBe(1);
	});

	test("partial number substring match", () => {
		expect(findMatch(prs, "23")).toBe(1);
	});

	test("title substring match", () => {
		expect(findMatch(prs, "arrow")).toBe(0);
		expect(findMatch(prs, "separators")).toBe(1);
		expect(findMatch(prs, "extract")).toBe(2);
	});

	test("title match is case-insensitive", () => {
		expect(findMatch(prs, "Arrow")).toBe(0);
		expect(findMatch(prs, "REFACTOR")).toBe(2);
	});

	test("author match", () => {
		expect(findMatch(prs, "bob")).toBe(1);
		expect(findMatch(prs, "carol")).toBe(2);
	});

	test("author match is case-insensitive", () => {
		expect(findMatch(prs, "Bob")).toBe(1);
	});

	test("returns first match when multiple PRs match", () => {
		expect(findMatch(prs, "alice")).toBe(0);
	});

	test("returns -1 for empty query", () => {
		expect(findMatch(prs, "")).toBe(-1);
	});

	test("returns -1 when nothing matches", () => {
		expect(findMatch(prs, "zzz")).toBe(-1);
		expect(findMatch(prs, "9999")).toBe(-1);
	});

	test("exact number takes priority over substring", () => {
		expect(findMatch(prs, "99")).toBe(3);
	});

	test("works with empty PR list", () => {
		expect(findMatch([], "482")).toBe(-1);
	});
});

describe("handleSearchKey", () => {
	test("typing a character appends to buffer and jumps to match", () => {
		const state = makeSearchState();
		handleSearchKey(state, "b", prs);
		expect(state.searchBuffer).toBe("b");
		expect(state.selectedIndex).toBe(1); // "bob" is author of index 1
		expect(state.searchMode).toBe(true);
	});

	test("typing multiple characters accumulates buffer", () => {
		const state = makeSearchState();
		handleSearchKey(state, "4", prs);
		handleSearchKey(state, "8", prs);
		handleSearchKey(state, "2", prs);
		expect(state.searchBuffer).toBe("482");
		expect(state.selectedIndex).toBe(2); // PR #482
	});

	test("enter confirms and exits search mode", () => {
		const state = makeSearchState({
			searchBuffer: "482",
			selectedIndex: 2,
			preSearchIndex: 0,
		});
		handleSearchKey(state, "\r", prs);
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
		handleSearchKey(state, "\x1B", prs);
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
		handleSearchKey(state, "\x03", prs);
		expect(state.searchMode).toBe(false);
		expect(state.selectedIndex).toBe(3);
	});

	test("backspace removes last character and re-searches", () => {
		const state = makeSearchState({
			searchBuffer: "bo",
			selectedIndex: 1,
		});
		handleSearchKey(state, "\x7F", prs);
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
		handleSearchKey(state, "\x7F", prs);
		expect(state.searchBuffer).toBe("");
		expect(state.selectedIndex).toBe(3); // restored to preSearchIndex
		expect(state.searchMode).toBe(true); // still in search mode
	});

	test("no match sets message", () => {
		const state = makeSearchState();
		handleSearchKey(state, "z", prs);
		handleSearchKey(state, "z", prs);
		handleSearchKey(state, "z", prs);
		expect(state.searchBuffer).toBe("zzz");
		expect(state.message).toBe("no match");
		expect(state.searchMode).toBe(true);
	});

	test("no match does not change selectedIndex", () => {
		const state = makeSearchState({ selectedIndex: 2 });
		handleSearchKey(state, "z", prs);
		expect(state.selectedIndex).toBe(2);
	});

	test("ignores non-printable characters", () => {
		const state = makeSearchState({ selectedIndex: 0 });
		handleSearchKey(state, "\x01", prs); // Ctrl+A
		expect(state.searchBuffer).toBe("");
		expect(state.selectedIndex).toBe(0);
	});
});

const STATE_DIR = path.join(process.env.HOME ?? "", ".config", "prq");
const STATE_PATH = path.join(STATE_DIR, "state.json");

function makeResult(prs: CategorizedPR[], user = "me"): StatusResult {
	return { user, timestamp: new Date().toISOString(), prs };
}

describe("recomputeState", () => {
	afterEach(() => {
		try {
			fs.unlinkSync(STATE_PATH);
		} catch {}
	});

	test("moves nudged PR to nudged category after markNudged", () => {
		const stalePR = makePR({
			number: 42,
			category: "stale",
			detail: "No activity for 5 days",
		});
		const requestedPR = makePR({
			number: 10,
			category: "requested",
			detail: "Requested 1d ago",
		});
		const sourcePrs = [stalePR, requestedPR];

		const state = {
			result: makeResult([stalePR, requestedPR]),
			sourcePrs,
			selectedIndex: 0,
		};

		// Simulate what the action hook does after a successful nudge
		markNudged({ repo: "org/repo", number: 42 });
		recomputeState(state, stalePR);

		const nudgedPR = state.result.prs.find((p) => p.number === 42);
		expect(nudgedPR).toBeDefined();
		expect(nudgedPR?.category).toBe("nudged");
		expect(nudgedPR?.detail).toMatch(/^Nudged /);
	});

	test("moves in-progress PR to in-progress category after toggle", () => {
		const stalePR = makePR({
			number: 42,
			category: "stale",
			detail: "No activity for 5 days",
		});
		const sourcePrs = [stalePR];

		const state = {
			result: makeResult([stalePR]),
			sourcePrs,
			selectedIndex: 0,
		};

		toggleInProgress(stalePR);
		recomputeState(state, stalePR);

		expect(state.result.prs[0].category).toBe("in-progress");
	});

	test("selectedIndex follows target PR to new position", () => {
		// Order: in-progress comes before stale in category sort
		const stalePR = makePR({
			number: 42,
			repo: "org/repo",
			category: "stale",
		});
		const requestedPR = makePR({
			number: 10,
			repo: "org/repo",
			category: "requested",
		});
		// Source order: requested (idx 0), stale (idx 1)
		const sourcePrs = [requestedPR, stalePR];

		const state = {
			result: makeResult(sourcePrs),
			sourcePrs,
			selectedIndex: 1, // pointing at stalePR
		};

		// Mark stalePR as nudged — it should move to the nudged category
		markNudged({ repo: "org/repo", number: 42 });
		recomputeState(state, stalePR);

		// selectedIndex should follow PR #42 to its new position
		const newPR = state.result.prs[state.selectedIndex];
		expect(newPR.number).toBe(42);
	});

	test("selectedIndex clamped when target PR disappears", () => {
		const pr1 = makePR({ number: 1 });
		const pr2 = makePR({ number: 2 });
		const sourcePrs = [pr1, pr2];

		const state = {
			result: makeResult(sourcePrs),
			sourcePrs,
			selectedIndex: 5, // out of range
		};

		// Target PR not in list — selectedIndex should clamp
		recomputeState(state, { repo: "org/gone", number: 999 });
		expect(state.selectedIndex).toBeLessThan(state.result.prs.length);
	});
});
