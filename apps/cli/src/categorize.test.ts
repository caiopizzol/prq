import { describe, expect, test } from "bun:test";
import { categorize, categorizeIssues } from "./categorize.js";
import type {
	IssueWithComments,
	PRBasic,
	PRWithCommit,
	PRWithReviews,
} from "./github/types.js";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

function makePR(overrides: Partial<PRBasic> = {}): PRBasic {
	return {
		number: 1,
		title: "test pr",
		author: "alice",
		repo: "org/repo",
		url: "https://github.com/org/repo/pull/1",
		isDraft: false,
		updatedAt: hoursAgo(1),
		requestedReviewers: [],
		labels: [],
		...overrides,
	};
}

function makeOpenPR(overrides: Partial<PRWithCommit> = {}): PRWithCommit {
	return {
		...makePR(),
		latestCommitAt: hoursAgo(2),
		...overrides,
	};
}

function makeReviewedPR(overrides: Partial<PRWithReviews> = {}): PRWithReviews {
	return {
		...makePR(),
		userLastReviewedAt: daysAgo(2),
		latestCommitAt: daysAgo(1),
		latestAuthorCommentAt: null,
		...overrides,
	};
}

function makeIssue(
	overrides: Partial<IssueWithComments> = {},
): IssueWithComments {
	return {
		number: 100,
		title: "test issue",
		author: "alice",
		repo: "org/repo",
		url: "https://github.com/org/repo/issues/100",
		updatedAt: hoursAgo(1),
		assignees: ["me"],
		labels: [],
		userLastCommentAt: null,
		latestOtherCommentAt: null,
		...overrides,
	};
}

describe("categorize", () => {
	test("returns empty array when no PRs", () => {
		const result = categorize([], [], [], 3, []);
		expect(result).toEqual([]);
	});

	test("sets type to pr for all results", () => {
		const requested = [makePR({ number: 20, author: "bob" })];
		const result = categorize([], requested, [], 3, []);
		expect(result[0].type).toBe("pr");
	});

	test("detects needs-re-review when commits are newer than review", () => {
		const reviewed = [
			makeReviewedPR({
				number: 10,
				userLastReviewedAt: daysAgo(3),
				latestCommitAt: daysAgo(1),
			}),
		];

		const result = categorize(reviewed, [], [], 3, []);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("needs-re-review");
		expect(result[0].number).toBe(10);
	});

	test("does NOT flag needs-re-review when review is newer than commits", () => {
		const reviewed = [
			makeReviewedPR({
				userLastReviewedAt: daysAgo(1),
				latestCommitAt: daysAgo(3),
			}),
		];

		const result = categorize(reviewed, [], [], 3, []);
		const reReview = result.filter((r) => r.category === "needs-re-review");
		expect(reReview).toHaveLength(0);
	});

	test("categorizes requested reviews", () => {
		const requested = [makePR({ number: 20, author: "bob" })];

		const result = categorize([], requested, [], 3, []);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("requested");
		expect(result[0].number).toBe(20);
	});

	test("needs-re-review takes priority over requested", () => {
		const pr = makeReviewedPR({
			number: 30,
			userLastReviewedAt: daysAgo(3),
			latestCommitAt: daysAgo(1),
		});
		const requested = [makePR({ number: 30 })];

		const result = categorize([pr], requested, [], 3, []);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("needs-re-review");
	});

	test("detects stale PRs", () => {
		const reviewed = [
			makeReviewedPR({
				number: 40,
				userLastReviewedAt: daysAgo(5),
				latestCommitAt: daysAgo(6),
				updatedAt: daysAgo(5),
			}),
		];

		const result = categorize(reviewed, [], [], 3, []);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("stale");
		expect(result[0].detail).toContain("No activity for");
	});

	test("does NOT flag stale if within threshold", () => {
		const reviewed = [
			makeReviewedPR({
				userLastReviewedAt: daysAgo(1),
				latestCommitAt: daysAgo(2),
				updatedAt: hoursAgo(12),
			}),
		];

		const result = categorize(reviewed, [], [], 3, []);
		const stale = result.filter((r) => r.category === "stale");
		expect(stale).toHaveLength(0);
	});

	test("detects your PRs waiting on others", () => {
		const authored = [
			makePR({
				number: 50,
				author: "me",
				requestedReviewers: ["alice", "bob"],
			}),
		];

		const result = categorize([], [], authored, 3, []);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("waiting-on-others");
		expect(result[0].detail).toContain("@alice");
		expect(result[0].detail).toContain("@bob");
	});

	test("flags authored PRs with no requested reviewers as waiting-on-others", () => {
		const authored = [makePR({ number: 60, author: "me" })];

		const result = categorize([], [], authored, 3, []);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("waiting-on-others");
		expect(result[0].detail).toContain("No reviewers assigned");
	});

	test("deduplicates PRs across categories", () => {
		const pr = makeReviewedPR({
			number: 70,
			author: "me",
			userLastReviewedAt: daysAgo(3),
			latestCommitAt: daysAgo(1),
			requestedReviewers: ["someone"],
		});

		const result = categorize(
			[pr],
			[makePR({ number: 70 })],
			[makePR({ number: 70, requestedReviewers: ["someone"] })],
			3,
			[],
		);

		// Should only appear once (needs-re-review wins)
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("needs-re-review");
	});

	test("categorizes open PRs when allOpenPRs is provided", () => {
		const allOpen = [makeOpenPR({ number: 80, author: "eve" })];

		const result = categorize([], [], [], 3, allOpen);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("open");
		expect(result[0].number).toBe(80);
		expect(result[0].detail).toContain("Last commit");
	});

	test("deduplicates open PRs against earlier categories", () => {
		const requested = [makePR({ number: 90, author: "bob" })];
		const allOpen = [
			makeOpenPR({ number: 90, author: "bob" }),
			makeOpenPR({ number: 91, author: "carol" }),
		];

		const result = categorize([], requested, [], 3, allOpen);
		expect(result).toHaveLength(2);
		expect(result[0].category).toBe("requested");
		expect(result[0].number).toBe(90);
		expect(result[1].category).toBe("open");
		expect(result[1].number).toBe(91);
	});

	test("empty allOpenPRs produces no open entries", () => {
		const result = categorize([], [], [], 3, []);
		const open = result.filter((r) => r.category === "open");
		expect(open).toHaveLength(0);
	});

	test("handles multiple PRs across all categories", () => {
		const reviewed = [
			makeReviewedPR({
				number: 1,
				userLastReviewedAt: daysAgo(3),
				latestCommitAt: daysAgo(1),
			}),
			makeReviewedPR({
				number: 2,
				userLastReviewedAt: daysAgo(10),
				latestCommitAt: daysAgo(11),
				updatedAt: daysAgo(10),
			}),
		];
		const requested = [makePR({ number: 3 })];
		const authored = [makePR({ number: 4, requestedReviewers: ["reviewer"] })];

		const result = categorize(reviewed, requested, authored, 3, []);

		const categories = result.map((r) => r.category);
		expect(categories).toContain("needs-re-review");
		expect(categories).toContain("stale");
		expect(categories).toContain("requested");
		expect(categories).toContain("waiting-on-others");
		expect(result).toHaveLength(4);
	});
});

describe("categorizeIssues", () => {
	test("returns empty array when no issues", () => {
		const result = categorizeIssues([], [], 3);
		expect(result).toEqual([]);
	});

	test("sets type to issue for all results", () => {
		const assigned = [makeIssue({ number: 10 })];
		const result = categorizeIssues(assigned, [], 3);
		expect(result[0].type).toBe("issue");
	});

	test("detects needs-response when new comment exists after user's last comment", () => {
		const assigned = [
			makeIssue({
				number: 10,
				userLastCommentAt: daysAgo(3),
				latestOtherCommentAt: daysAgo(1),
			}),
		];

		const result = categorizeIssues(assigned, [], 3);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("needs-re-review");
		expect(result[0].detail).toContain("New comment");
	});

	test("detects needs-response when user never commented but others did", () => {
		const assigned = [
			makeIssue({
				number: 10,
				userLastCommentAt: null,
				latestOtherCommentAt: daysAgo(1),
			}),
		];

		const result = categorizeIssues(assigned, [], 3);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("needs-re-review");
	});

	test("detects requested for newly assigned issues with no user activity", () => {
		const assigned = [
			makeIssue({
				number: 20,
				userLastCommentAt: null,
				latestOtherCommentAt: null,
			}),
		];

		const result = categorizeIssues(assigned, [], 3);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("requested");
		expect(result[0].detail).toContain("Assigned");
	});

	test("detects stale issues with no activity beyond threshold", () => {
		const assigned = [
			makeIssue({
				number: 30,
				updatedAt: daysAgo(10),
				userLastCommentAt: daysAgo(10),
				latestOtherCommentAt: null,
			}),
		];

		const result = categorizeIssues(assigned, [], 3);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("stale");
		expect(result[0].detail).toContain("No activity for");
	});

	test("detects waiting-on-others when user commented last", () => {
		const assigned = [
			makeIssue({
				number: 40,
				updatedAt: hoursAgo(2),
				userLastCommentAt: hoursAgo(2),
				latestOtherCommentAt: daysAgo(3),
			}),
		];

		const result = categorizeIssues(assigned, [], 3);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("waiting-on-others");
		expect(result[0].detail).toContain("You commented last");
	});

	test("detects mentioned issues", () => {
		const mentioned = [makeIssue({ number: 50 })];

		const result = categorizeIssues([], mentioned, 3);
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("mentioned");
		expect(result[0].detail).toContain("Mentioned");
	});

	test("deduplicates issues across categories", () => {
		const assigned = [
			makeIssue({
				number: 60,
				userLastCommentAt: daysAgo(3),
				latestOtherCommentAt: daysAgo(1),
			}),
		];
		const mentioned = [makeIssue({ number: 60 })];

		const result = categorizeIssues(assigned, mentioned, 3);
		// Should only appear once (needs-response wins over mentioned)
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("needs-re-review");
	});
});
