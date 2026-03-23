import { describe, expect, test } from "bun:test";
import { findMatch, handleSearchKey, type SearchState } from "./interactive.js";
import type { CategorizedPR } from "./types.js";

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
