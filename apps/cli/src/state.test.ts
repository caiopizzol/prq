import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { sortByCategory } from "./categories.js";
import {
	applyInProgress,
	applyNudged,
	getNudgedAt,
	loadInProgress,
	markNudged,
	toggleInProgress,
} from "./state.js";
import type { CategorizedItem } from "./types.js";

const STATE_DIR = path.join(process.env.HOME ?? "", ".config", "prq");
const STATE_PATH = path.join(STATE_DIR, "state.json");

function makeItem(overrides: Partial<CategorizedItem> = {}): CategorizedItem {
	return {
		type: "pr",
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
	test("marks item as in-progress and returns true", () => {
		const item = makeItem({ number: 10 });
		const result = toggleInProgress(item);
		expect(result).toBe(true);
		expect(loadInProgress().has("org/repo#10")).toBe(true);
	});

	test("unmarks item and returns false", () => {
		const item = makeItem({ number: 10 });
		toggleInProgress(item); // mark
		const result = toggleInProgress(item); // unmark
		expect(result).toBe(false);
		expect(loadInProgress().has("org/repo#10")).toBe(false);
	});

	test("preserves nudgedAt when toggling in-progress", () => {
		const item = makeItem({ number: 10 });
		markNudged({ repo: "org/repo", number: 10 });
		toggleInProgress(item);
		expect(getNudgedAt({ repo: "org/repo", number: 10 })).not.toBeNull();
		expect(loadInProgress().has("org/repo#10")).toBe(true);
	});
});

describe("applyInProgress", () => {
	test("returns same array when no state", () => {
		const items = [makeItem({ number: 1 }), makeItem({ number: 2 })];
		const result = applyInProgress(items);
		expect(result).toEqual(items);
	});

	test("changes category to in-progress for marked items", () => {
		const item = makeItem({ number: 10, category: "stale" });
		toggleInProgress(item);

		const items = [
			makeItem({ number: 10, category: "stale" }),
			makeItem({ number: 20, category: "requested" }),
		];
		const result = applyInProgress(items);

		expect(result[0].category).toBe("in-progress");
		expect(result[0].detail).toBe("test detail"); // preserves detail
		expect(result[1].category).toBe("requested");
	});

	test("cleans up keys for items no longer in queue", () => {
		const item = makeItem({ number: 99 });
		toggleInProgress(item);
		expect(loadInProgress().has("org/repo#99")).toBe(true);

		// Apply with a list that doesn't include #99 (it was merged)
		applyInProgress([makeItem({ number: 1 })]);
		expect(loadInProgress().has("org/repo#99")).toBe(false);
	});

	test("auto-clears when review was submitted after marking in-progress", () => {
		const item = makeItem({ number: 10, category: "stale" });
		toggleInProgress(item);
		expect(loadInProgress().has("org/repo#10")).toBe(true);

		// Simulate a review submitted after marking in-progress
		const reviewTimestamps = new Map([
			["org/repo#10", new Date(Date.now() + 60_000).toISOString()],
		]);

		const items = [makeItem({ number: 10, category: "stale" })];
		const result = applyInProgress(items, reviewTimestamps);

		expect(result[0].category).toBe("stale"); // not overridden
		expect(loadInProgress().has("org/repo#10")).toBe(false); // cleared from state
	});

	test("does not auto-clear when review was before marking in-progress", () => {
		const item = makeItem({ number: 10, category: "stale" });

		// Simulate a review submitted before marking in-progress
		const reviewTimestamps = new Map([
			["org/repo#10", new Date(Date.now() - 60_000).toISOString()],
		]);

		toggleInProgress(item);

		const items = [makeItem({ number: 10, category: "stale" })];
		const result = applyInProgress(items, reviewTimestamps);

		expect(result[0].category).toBe("in-progress");
		expect(loadInProgress().has("org/repo#10")).toBe(true);
	});

	test("handles legacy boolean inProgress without auto-clearing", () => {
		// Write legacy format directly
		fs.mkdirSync(STATE_DIR, { recursive: true });
		fs.writeFileSync(
			STATE_PATH,
			JSON.stringify({ "org/repo#10": { inProgress: true } }),
		);

		const reviewTimestamps = new Map([
			["org/repo#10", new Date().toISOString()],
		]);

		const items = [makeItem({ number: 10, category: "stale" })];
		const result = applyInProgress(items, reviewTimestamps);

		// Legacy boolean can't be compared — should stay in-progress
		expect(result[0].category).toBe("in-progress");
		expect(loadInProgress().has("org/repo#10")).toBe(true);
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
		const item = makeItem({ number: 10 });
		toggleInProgress(item);
		markNudged({ repo: "org/repo", number: 10 });
		expect(loadInProgress().has("org/repo#10")).toBe(true);
		expect(getNudgedAt({ repo: "org/repo", number: 10 })).not.toBeNull();
	});
});

describe("applyNudged", () => {
	test("returns same array when no nudged state", () => {
		const items = [makeItem({ number: 1 }), makeItem({ number: 2 })];
		const result = applyNudged(items);
		expect(result).toEqual(items);
	});

	test("changes category to nudged for nudged items", () => {
		markNudged({ repo: "org/repo", number: 10 });
		const items = [
			makeItem({ number: 10, category: "stale" }),
			makeItem({ number: 20, category: "requested" }),
		];
		const result = applyNudged(items);
		expect(result[0].category).toBe("nudged");
		expect(result[0].detail).toMatch(/^Nudged /);
		expect(result[1].category).toBe("requested");
	});

	test("does not override in-progress category", () => {
		markNudged({ repo: "org/repo", number: 10 });
		const items = [makeItem({ number: 10, category: "in-progress" })];
		const result = applyNudged(items);
		expect(result[0].category).toBe("in-progress");
	});

	test("cleans up nudgedAt for items no longer in queue", () => {
		markNudged({ repo: "org/repo", number: 99 });
		expect(getNudgedAt({ repo: "org/repo", number: 99 })).not.toBeNull();
		applyNudged([makeItem({ number: 1 })]);
		expect(getNudgedAt({ repo: "org/repo", number: 99 })).toBeNull();
	});
});

describe("sortByCategory", () => {
	test("groups items by category order", () => {
		const items = [
			makeItem({ number: 1, category: "open" }),
			makeItem({ number: 2, category: "in-progress" }),
			makeItem({ number: 3, category: "requested" }),
			makeItem({ number: 4, category: "in-progress" }),
		];
		const sorted = sortByCategory(items);
		expect(sorted.map((p) => p.category)).toEqual([
			"in-progress",
			"in-progress",
			"requested",
			"open",
		]);
	});

	test("sorts by updatedAt within same category", () => {
		const older = new Date("2026-01-01").toISOString();
		const newer = new Date("2026-03-01").toISOString();
		const items = [
			makeItem({ number: 1, category: "requested", updatedAt: older }),
			makeItem({ number: 2, category: "requested", updatedAt: newer }),
		];
		const sorted = sortByCategory(items);
		expect(sorted[0].number).toBe(2); // newer first
		expect(sorted[1].number).toBe(1);
	});

	test("does not mutate original array", () => {
		const items = [
			makeItem({ number: 1, category: "open" }),
			makeItem({ number: 2, category: "in-progress" }),
		];
		const sorted = sortByCategory(items);
		expect(items[0].category).toBe("open"); // original unchanged
		expect(sorted[0].category).toBe("in-progress");
	});
});
