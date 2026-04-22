import { describe, expect, test } from "bun:test";
import { formatClauses, parseFilterFlags, relaxFilter } from "./filter.js";
import type { CategorizedItem } from "./types.js";

function makeItem(overrides: Partial<CategorizedItem> = {}): CategorizedItem {
	return {
		type: "pr",
		source: "github",
		category: "requested",
		repo: "org/repo",
		number: 1,
		title: "test",
		author: "alice",
		url: "https://example.com",
		isDraft: false,
		updatedAt: new Date().toISOString(),
		detail: "",
		labels: [],
		...overrides,
	};
}

describe("relaxFilter", () => {
	test("returns unchanged filter when items match", () => {
		const items = [makeItem({ type: "pr", labels: ["future"] })];
		const filter = parseFilterFlags(["type:pr", "label:future"]);
		const result = relaxFilter(items, filter);
		expect(result.filter).toEqual(filter);
		expect(result.dropped).toEqual([]);
	});

	test("drops rightmost clause when nothing matches", () => {
		const items = [makeItem({ type: "pr", labels: [] })];
		const filter = parseFilterFlags(["type:pr", "label:future"]);
		const result = relaxFilter(items, filter);
		expect(result.filter.map((c) => c.key)).toEqual(["type"]);
		expect(result.dropped.map((c) => c.key)).toEqual(["label"]);
	});

	test("drops all clauses when no prefix yields items", () => {
		const items = [makeItem({ type: "issue", labels: [] })];
		const filter = parseFilterFlags(["type:pr", "label:future"]);
		const result = relaxFilter(items, filter);
		expect(result.filter).toEqual([]);
		expect(result.dropped.map((c) => c.key)).toEqual(["type", "label"]);
	});

	test("no-op on empty filter", () => {
		const items = [makeItem()];
		const result = relaxFilter(items, []);
		expect(result.filter).toEqual([]);
		expect(result.dropped).toEqual([]);
	});

	test("preserves dropped clause order (left-to-right)", () => {
		const items: CategorizedItem[] = [];
		const filter = parseFilterFlags(["type:pr", "label:future", "author:bob"]);
		const result = relaxFilter(items, filter);
		expect(result.dropped.map((c) => c.key)).toEqual([
			"type",
			"label",
			"author",
		]);
	});

	test("stops at longest non-empty prefix with 3 clauses", () => {
		const items = [
			makeItem({ type: "pr", labels: [], author: "alice" }),
			makeItem({ type: "pr", labels: [], author: "carol" }),
		];
		const filter = parseFilterFlags([
			"type:pr",
			"label:future",
			"author:bob",
		]);
		const result = relaxFilter(items, filter);
		expect(result.filter.map((c) => c.key)).toEqual(["type"]);
		expect(result.dropped.map((c) => c.key)).toEqual(["label", "author"]);
	});
});

describe("formatClauses", () => {
	test("emits key:value for include clauses", () => {
		const filter = parseFilterFlags(["type:pr", "author:bob"]);
		expect(formatClauses(filter)).toBe("type:pr, author:bob");
	});

	test("prefixes exclude clauses with !", () => {
		const filter = parseFilterFlags(["!author:bot", "type:pr"]);
		expect(formatClauses(filter)).toBe("!author:bot, type:pr");
	});

	test("joins multi-value clauses with commas", () => {
		const filter = parseFilterFlags(["label:priority,urgent"]);
		expect(formatClauses(filter)).toBe("label:priority,urgent");
	});

	test("empty input produces empty string", () => {
		expect(formatClauses([])).toBe("");
	});
});
