import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { applyInProgress, loadInProgress, toggleInProgress } from "./state.js";
import type { CategorizedPR } from "./types.js";

const STATE_PATH = path.join(
	process.env.HOME ?? "",
	".config",
	"prq",
	"in-progress.json",
);

function makePR(overrides: Partial<CategorizedPR> = {}): CategorizedPR {
	return {
		category: "needs-re-review",
		repo: "org/repo",
		number: 1,
		title: "test pr",
		author: "alice",
		url: "https://github.com/org/repo/pull/1",
		isDraft: false,
		updatedAt: new Date().toISOString(),
		detail: "test detail",
		...overrides,
	};
}

afterEach(() => {
	try {
		fs.unlinkSync(STATE_PATH);
	} catch {}
});

describe("loadInProgress", () => {
	test("returns empty set when no state file", () => {
		const result = loadInProgress();
		expect(result.size).toBe(0);
	});

	test("returns keys from state file", () => {
		fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
		fs.writeFileSync(STATE_PATH, JSON.stringify(["org/repo#1", "org/repo#2"]));
		const result = loadInProgress();
		expect(result.size).toBe(2);
		expect(result.has("org/repo#1")).toBe(true);
		expect(result.has("org/repo#2")).toBe(true);
	});
});

describe("toggleInProgress", () => {
	test("marks PR as in-progress and returns true", () => {
		const pr = makePR({ number: 10 });
		const result = toggleInProgress(pr);
		expect(result).toBe(true);
		expect(loadInProgress().has("org/repo#10")).toBe(true);
	});

	test("unmarks PR and returns false", () => {
		const pr = makePR({ number: 10 });
		toggleInProgress(pr); // mark
		const result = toggleInProgress(pr); // unmark
		expect(result).toBe(false);
		expect(loadInProgress().has("org/repo#10")).toBe(false);
	});
});

describe("applyInProgress", () => {
	test("returns same array when no state", () => {
		const prs = [makePR({ number: 1 }), makePR({ number: 2 })];
		const result = applyInProgress(prs);
		expect(result).toEqual(prs);
	});

	test("changes category to in-progress for marked PRs", () => {
		const pr = makePR({ number: 10, category: "stale" });
		toggleInProgress(pr);

		const prs = [
			makePR({ number: 10, category: "stale" }),
			makePR({ number: 20, category: "requested" }),
		];
		const result = applyInProgress(prs);

		expect(result[0].category).toBe("in-progress");
		expect(result[0].detail).toBe("test detail"); // preserves detail
		expect(result[1].category).toBe("requested");
	});

	test("cleans up keys for PRs no longer in queue", () => {
		const pr = makePR({ number: 99 });
		toggleInProgress(pr);
		expect(loadInProgress().has("org/repo#99")).toBe(true);

		// Apply with a list that doesn't include #99 (it was merged)
		applyInProgress([makePR({ number: 1 })]);
		expect(loadInProgress().has("org/repo#99")).toBe(false);
	});
});
