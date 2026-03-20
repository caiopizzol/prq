import { beforeAll, describe, expect, test } from "bun:test";
import chalk from "chalk";
import { formatStatus } from "./output.js";
import type { CategorizedPR, StatusResult } from "./types.js";

// Force chalk to output colors so we can test for content
beforeAll(() => {
	chalk.level = 0; // disable colors for predictable string matching
});

function makeCategorizedPR(
	overrides: Partial<CategorizedPR> = {},
): CategorizedPR {
	return {
		category: "requested",
		repo: "org/repo",
		number: 1,
		title: "test pr",
		author: "alice",
		url: "https://github.com/org/repo/pull/1",
		isDraft: false,
		updatedAt: new Date().toISOString(),
		detail: "Requested 1d ago",
		...overrides,
	};
}

describe("formatStatus", () => {
	test("shows 'all clear' when no PRs", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [],
		};

		const output = formatStatus(result);
		expect(output).toContain("PRQ Status for testuser");
		expect(output).toContain("All clear");
	});

	test("shows correct count and repo summary", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [
				makeCategorizedPR({ repo: "org/repo1", number: 1 }),
				makeCategorizedPR({ repo: "org/repo2", number: 2 }),
				makeCategorizedPR({ repo: "org/repo1", number: 3 }),
			],
		};

		const output = formatStatus(result);
		expect(output).toContain("3 PRs need attention across 2 repos");
	});

	test("singular form for 1 PR in 1 repo", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [makeCategorizedPR()],
		};

		const output = formatStatus(result);
		expect(output).toContain("1 PR need attention across 1 repo");
	});

	test("groups PRs by category in correct order", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [
				makeCategorizedPR({ category: "waiting-on-others", number: 4 }),
				makeCategorizedPR({ category: "needs-re-review", number: 1 }),
				makeCategorizedPR({ category: "stale", number: 3 }),
				makeCategorizedPR({ category: "requested", number: 2 }),
			],
		};

		const output = formatStatus(result);
		const reReviewIdx = output.indexOf("Needs Re-review");
		const requestedIdx = output.indexOf("Requested Reviews");
		const staleIdx = output.indexOf("Stale");
		const waitingIdx = output.indexOf("Your PRs Waiting");

		expect(reReviewIdx).toBeLessThan(requestedIdx);
		expect(requestedIdx).toBeLessThan(staleIdx);
		expect(staleIdx).toBeLessThan(waitingIdx);
	});

	test("skips empty categories", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [makeCategorizedPR({ category: "stale" })],
		};

		const output = formatStatus(result);
		expect(output).toContain("Stale");
		expect(output).not.toContain("Needs Re-review");
		expect(output).not.toContain("Requested Reviews");
		expect(output).not.toContain("Your PRs Waiting");
	});

	test("truncates long titles", () => {
		const longTitle = "a".repeat(80);
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [makeCategorizedPR({ title: longTitle })],
		};

		const output = formatStatus(result);
		expect(output).toContain("aaa...");
		expect(output).not.toContain(longTitle);
	});

	test("shows [draft] marker for draft PRs", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [makeCategorizedPR({ isDraft: true })],
		};

		const output = formatStatus(result);
		expect(output).toContain("[draft]");
	});

	test("does NOT show [draft] for non-draft PRs", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [makeCategorizedPR({ isDraft: false })],
		};

		const output = formatStatus(result);
		expect(output).not.toContain("[draft]");
	});

	test("shows PR detail line", () => {
		const result: StatusResult = {
			user: "testuser",
			timestamp: new Date().toISOString(),
			prs: [
				makeCategorizedPR({ detail: "New commits since your review 2d ago" }),
			],
		};

		const output = formatStatus(result);
		expect(output).toContain("New commits since your review 2d ago");
	});
});
