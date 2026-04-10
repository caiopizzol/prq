import { beforeAll, describe, expect, test } from "bun:test";
import chalk from "chalk";
import { formatStatus } from "./output.js";
import type { CategorizedItem, StatusResult } from "./types.js";

// Force chalk to output colors so we can test for content
beforeAll(() => {
	chalk.level = 0; // disable colors for predictable string matching
});

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
		detail: "Requested 1d ago",
		labels: [],
		...overrides,
	};
}

describe("formatStatus", () => {
	test("shows 'all clear' when no items", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [],
		};

		const output = formatStatus(result);
		expect(output).toContain("PRQ Status for testuser");
		expect(output).toContain("All clear");
	});

	test("shows correct count and repo summary for PRs", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [
				makeItem({ repo: "org/repo1", number: 1 }),
				makeItem({ repo: "org/repo2", number: 2 }),
				makeItem({ repo: "org/repo1", number: 3 }),
			],
		};

		const output = formatStatus(result);
		expect(output).toContain("3 PRs");
		expect(output).toContain("2 repos");
	});

	test("shows mixed PR and issue counts", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [
				makeItem({ type: "pr", number: 1 }),
				makeItem({ type: "issue", number: 2 }),
				makeItem({ type: "issue", number: 3 }),
			],
		};

		const output = formatStatus(result);
		expect(output).toContain("1 PR");
		expect(output).toContain("2 issues");
	});

	test("groups items by category in correct order", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [
				makeItem({ category: "waiting-on-others", number: 5 }),
				makeItem({ category: "needs-re-review", number: 2 }),
				makeItem({ category: "in-progress", number: 1 }),
				makeItem({ category: "stale", number: 4 }),
				makeItem({ category: "requested", number: 3 }),
				makeItem({ category: "mentioned", type: "issue", number: 7 }),
				makeItem({ category: "open", number: 6 }),
			],
		};

		const output = formatStatus(result);
		const inProgressIdx = output.indexOf("▸ In Progress");
		const needsResponseIdx = output.indexOf("◆ Needs Response");
		const requestedIdx = output.indexOf("● Requested");
		const staleIdx = output.indexOf("○ Stale");
		const waitingIdx = output.indexOf("◇ Waiting on Others");
		const mentionedIdx = output.indexOf("· Mentioned");
		const openIdx = output.indexOf("◦ All Open");

		expect(inProgressIdx).toBeLessThan(needsResponseIdx);
		expect(needsResponseIdx).toBeLessThan(requestedIdx);
		expect(requestedIdx).toBeLessThan(staleIdx);
		expect(staleIdx).toBeLessThan(waitingIdx);
		expect(waitingIdx).toBeLessThan(mentionedIdx);
		expect(mentionedIdx).toBeLessThan(openIdx);
	});

	test("skips empty categories", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [
				makeItem({ category: "stale", detail: "No activity for 5 days" }),
			],
		};

		const output = formatStatus(result);
		expect(output).toContain("○ Stale");
		expect(output).not.toContain("◆ Needs Response");
		expect(output).not.toContain("● Requested");
		expect(output).not.toContain("◇ Waiting on Others");
	});

	test("truncates long titles", () => {
		const longTitle = "a".repeat(80);
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [makeItem({ title: longTitle })],
		};

		const output = formatStatus(result);
		expect(output).toContain("aaa...");
		expect(output).not.toContain(longTitle);
	});

	test("shows [draft] marker for draft PRs", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [makeItem({ isDraft: true })],
		};

		const output = formatStatus(result);
		expect(output).toContain("[draft]");
	});

	test("does NOT show [draft] for non-draft PRs", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [makeItem({ isDraft: false })],
		};

		const output = formatStatus(result);
		expect(output).not.toContain("[draft]");
	});

	test("shows detail line", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [makeItem({ detail: "New commits since your review 2d ago" })],
		};

		const output = formatStatus(result);
		expect(output).toContain("New commits since your review 2d ago");
	});

	test("shows type prefix for PRs and issues", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			items: [
				makeItem({ type: "pr", number: 1 }),
				makeItem({ type: "issue", number: 2 }),
			],
		};

		const output = formatStatus(result);
		expect(output).toContain("PR");
		expect(output).toContain("Issue");
	});
});
