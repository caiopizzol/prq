import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
	applyInProgress,
	applyNudged,
	getNudgedAt,
	loadInProgress,
	markNudged,
	toggleInProgress,
} from "./state.js";
import type { CategorizedPR } from "./types.js";

const STATE_DIR = path.join(process.env.HOME ?? "", ".config", "prq");
const STATE_PATH = path.join(STATE_DIR, "state.json");

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
		fs.mkdirSync(STATE_DIR, { recursive: true });
		fs.writeFileSync(
			STATE_PATH,
			JSON.stringify({
				"org/repo#1": { inProgress: true },
				"org/repo#2": { inProgress: true },
			}),
		);
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

	test("preserves nudgedAt when toggling in-progress", () => {
		const pr = makePR({ number: 10 });
		markNudged({ repo: "org/repo", number: 10 });
		toggleInProgress(pr);
		expect(getNudgedAt({ repo: "org/repo", number: 10 })).not.toBeNull();
		expect(loadInProgress().has("org/repo#10")).toBe(true);
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

describe("nudge state", () => {
	test("getNudgedAt returns null when not nudged", () => {
		expect(getNudgedAt({ repo: "org/repo", number: 1 })).toBeNull();
	});

	test("markNudged saves timestamp and getNudgedAt retrieves it", () => {
		markNudged({ repo: "org/repo", number: 5 });
		const nudgedAt = getNudgedAt({ repo: "org/repo", number: 5 });
		expect(nudgedAt).not.toBeNull();
		// biome-ignore lint/style/noNonNullAssertion: guarded by not-null assertion above
		expect(new Date(nudgedAt!).getTime()).toBeCloseTo(Date.now(), -3);
	});

	test("markNudged preserves inProgress state", () => {
		const pr = makePR({ number: 10 });
		toggleInProgress(pr);
		markNudged({ repo: "org/repo", number: 10 });
		expect(loadInProgress().has("org/repo#10")).toBe(true);
		expect(getNudgedAt({ repo: "org/repo", number: 10 })).not.toBeNull();
	});
});

describe("applyNudged", () => {
	test("returns same array when no nudged state", () => {
		const prs = [makePR({ number: 1 }), makePR({ number: 2 })];
		const result = applyNudged(prs);
		expect(result).toEqual(prs);
	});

	test("changes category to nudged for nudged PRs", () => {
		markNudged({ repo: "org/repo", number: 10 });
		const prs = [
			makePR({ number: 10, category: "stale" }),
			makePR({ number: 20, category: "requested" }),
		];
		const result = applyNudged(prs);
		expect(result[0].category).toBe("nudged");
		expect(result[0].detail).toMatch(/^Nudged /);
		expect(result[1].category).toBe("requested");
	});

	test("does not override in-progress category", () => {
		markNudged({ repo: "org/repo", number: 10 });
		const prs = [makePR({ number: 10, category: "in-progress" })];
		const result = applyNudged(prs);
		expect(result[0].category).toBe("in-progress");
	});

	test("cleans up nudgedAt for PRs no longer in queue", () => {
		markNudged({ repo: "org/repo", number: 99 });
		expect(getNudgedAt({ repo: "org/repo", number: 99 })).not.toBeNull();
		applyNudged([makePR({ number: 1 })]);
		expect(getNudgedAt({ repo: "org/repo", number: 99 })).toBeNull();
	});
});
