import type {
	IssueWithComments,
	PRBasic,
	PRWithCommit,
	PRWithReviews,
} from "./github/types.js";
import type { LinearIssue } from "./linear/types.js";
import type { CategorizedItem } from "./types.js";

export function timeAgo(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diffMs = now - then;
	const diffMins = Math.floor(diffMs / 60_000);
	const diffHours = Math.floor(diffMs / 3_600_000);
	const diffDays = Math.floor(diffMs / 86_400_000);

	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	return `${diffDays}d ago`;
}

function daysAgo(dateStr: string): number {
	return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export function categorize(
	reviewedPRs: PRWithReviews[],
	requestedPRs: PRBasic[],
	authoredPRs: PRBasic[],
	staleDays: number,
	allOpenPRs: PRWithCommit[],
): CategorizedItem[] {
	const results: CategorizedItem[] = [];
	const seen = new Set<string>();

	const key = (pr: { repo: string; number: number }) =>
		`${pr.repo}#${pr.number}`;

	// Build set of requested PRs for deduplication
	const requestedKeys = new Set(requestedPRs.map(key));

	// 1. Needs re-review: reviewed PRs with new commits since your review
	for (const pr of reviewedPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;

		const reviewDate = new Date(pr.userLastReviewedAt).getTime();
		const commitDate = new Date(pr.latestCommitAt).getTime();

		if (commitDate > reviewDate) {
			seen.add(k);
			results.push({
				type: "pr",
				source: "github",
				category: "needs-re-review",
				repo: pr.repo,
				number: pr.number,
				title: pr.title,
				author: pr.author,
				url: pr.url,
				isDraft: pr.isDraft,
				updatedAt: pr.updatedAt,
				detail: `New commits since your review ${timeAgo(pr.userLastReviewedAt)}`,
				labels: pr.labels,
			});
		}
	}

	// 2. Requested reviews (not already in needs-re-review)
	for (const pr of requestedPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;
		seen.add(k);

		results.push({
			type: "pr",
			source: "github",
			category: "requested",
			repo: pr.repo,
			number: pr.number,
			title: pr.title,
			author: pr.author,
			url: pr.url,
			isDraft: pr.isDraft,
			updatedAt: pr.updatedAt,
			detail: `Requested ${timeAgo(pr.updatedAt)}`,
			labels: pr.labels,
		});
	}

	// 3. Stale PRs: reviewed by you, no new commits, not requested, but inactive
	for (const pr of reviewedPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;
		if (requestedKeys.has(k)) continue;

		const inactive = daysAgo(pr.updatedAt);
		if (inactive >= staleDays) {
			seen.add(k);
			results.push({
				type: "pr",
				source: "github",
				category: "stale",
				repo: pr.repo,
				number: pr.number,
				title: pr.title,
				author: pr.author,
				url: pr.url,
				isDraft: pr.isDraft,
				updatedAt: pr.updatedAt,
				detail: `No activity for ${inactive} days`,
				labels: pr.labels,
			});
		}
	}

	// 3b. Reviewed PRs not stale, no new commits, not requested → waiting on author
	for (const pr of reviewedPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;
		if (requestedKeys.has(k)) continue;

		seen.add(k);
		results.push({
			type: "pr",
			source: "github",
			category: "waiting-on-others",
			repo: pr.repo,
			number: pr.number,
			title: pr.title,
			author: pr.author,
			url: pr.url,
			isDraft: pr.isDraft,
			updatedAt: pr.updatedAt,
			detail: `Reviewed, waiting on @${pr.author}`,
			labels: pr.labels,
		});
	}

	// 4. Your PRs waiting on others
	for (const pr of authoredPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;
		seen.add(k);

		const detail =
			pr.requestedReviewers.length > 0
				? `Waiting on review from ${pr.requestedReviewers.map((r) => `@${r}`).join(", ")}`
				: `No reviewers assigned`;
		results.push({
			type: "pr",
			source: "github",
			category: "waiting-on-others",
			repo: pr.repo,
			number: pr.number,
			title: pr.title,
			author: pr.author,
			url: pr.url,
			isDraft: pr.isDraft,
			updatedAt: pr.updatedAt,
			detail,
			labels: pr.labels,
		});
	}

	// 5. All other open PRs (when showAllOpen is enabled)
	for (const pr of allOpenPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;
		seen.add(k);

		results.push({
			type: "pr",
			source: "github",
			category: "open",
			repo: pr.repo,
			number: pr.number,
			title: pr.title,
			author: pr.author,
			url: pr.url,
			isDraft: pr.isDraft,
			updatedAt: pr.updatedAt,
			detail: `Last commit ${timeAgo(pr.latestCommitAt)}`,
			labels: pr.labels,
		});
	}

	// Sort within each category: most recent activity first
	results.sort((a, b) => {
		if (a.category !== b.category) return 0;
		return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
	});

	return results;
}

function makeIssueItem(
	issue: IssueWithComments,
	category: CategorizedItem["category"],
	detail: string,
): CategorizedItem {
	return {
		type: "issue",
		source: "github",
		category,
		repo: issue.repo,
		number: issue.number,
		title: issue.title,
		author: issue.author,
		url: issue.url,
		isDraft: false,
		updatedAt: issue.updatedAt,
		detail,
		labels: issue.labels,
	};
}

export function categorizeIssues(
	assignedIssues: IssueWithComments[],
	mentionedIssues: IssueWithComments[],
	staleDays: number,
): CategorizedItem[] {
	const results: CategorizedItem[] = [];
	const seen = new Set<string>();

	const key = (issue: { repo: string; number: number }) =>
		`${issue.repo}#${issue.number}`;

	// 1. Needs response: someone commented after your last comment
	for (const issue of assignedIssues) {
		const k = key(issue);
		if (seen.has(k)) continue;

		if (
			issue.latestOtherCommentAt &&
			(!issue.userLastCommentAt ||
				new Date(issue.latestOtherCommentAt).getTime() >
					new Date(issue.userLastCommentAt).getTime())
		) {
			seen.add(k);
			results.push(
				makeIssueItem(
					issue,
					"needs-re-review",
					`New comment ${timeAgo(issue.latestOtherCommentAt)}`,
				),
			);
		}
	}

	// 2. Requested: newly assigned, no activity from user yet
	for (const issue of assignedIssues) {
		const k = key(issue);
		if (seen.has(k)) continue;

		if (!issue.userLastCommentAt) {
			seen.add(k);
			results.push(
				makeIssueItem(
					issue,
					"requested",
					`Assigned ${timeAgo(issue.updatedAt)}`,
				),
			);
		}
	}

	// 3. Stale: assigned with no activity for N days
	for (const issue of assignedIssues) {
		const k = key(issue);
		if (seen.has(k)) continue;

		const inactive = daysAgo(issue.updatedAt);
		if (inactive >= staleDays) {
			seen.add(k);
			results.push(
				makeIssueItem(issue, "stale", `No activity for ${inactive} days`),
			);
		}
	}

	// 4. Waiting on others: user commented last, waiting for reply
	for (const issue of assignedIssues) {
		const k = key(issue);
		if (seen.has(k)) continue;

		if (
			issue.userLastCommentAt &&
			(!issue.latestOtherCommentAt ||
				new Date(issue.userLastCommentAt).getTime() >
					new Date(issue.latestOtherCommentAt).getTime())
		) {
			seen.add(k);
			results.push(
				makeIssueItem(
					issue,
					"waiting-on-others",
					`You commented last ${timeAgo(issue.userLastCommentAt)}`,
				),
			);
		}
	}

	// 5. Mentioned: @-mentioned but not assigned
	for (const issue of mentionedIssues) {
		const k = key(issue);
		if (seen.has(k)) continue;
		seen.add(k);

		results.push(
			makeIssueItem(
				issue,
				"mentioned",
				`Mentioned ${timeAgo(issue.updatedAt)}`,
			),
		);
	}

	return results;
}

export function categorizeLinearIssues(
	issues: LinearIssue[],
): CategorizedItem[] {
	return issues.map((issue) => ({
		type: "issue",
		source: "linear",
		category: issue.stateType === "started" ? "in-progress" : "requested",
		repo: issue.teamKey,
		number: issue.number,
		title: issue.title,
		author: issue.creator,
		url: issue.url,
		isDraft: false,
		updatedAt: issue.updatedAt,
		detail: `${issue.stateName} · updated ${timeAgo(issue.updatedAt)}`,
		labels: issue.labels,
	}));
}
