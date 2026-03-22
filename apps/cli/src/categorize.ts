import type { PRBasic, PRWithCommit, PRWithReviews } from "./github/types.js";
import type { CategorizedPR } from "./types.js";

function timeAgo(dateStr: string): string {
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
): CategorizedPR[] {
	const results: CategorizedPR[] = [];
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
			// Count commits after review (approximate from timestamp)
			results.push({
				category: "needs-re-review",
				repo: pr.repo,
				number: pr.number,
				title: pr.title,
				author: pr.author,
				url: pr.url,
				isDraft: pr.isDraft,
				updatedAt: pr.updatedAt,
				detail: `New commits since your review ${timeAgo(pr.userLastReviewedAt)}`,
			});
		}
	}

	// 2. Requested reviews (not already in needs-re-review)
	for (const pr of requestedPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;
		seen.add(k);

		results.push({
			category: "requested",
			repo: pr.repo,
			number: pr.number,
			title: pr.title,
			author: pr.author,
			url: pr.url,
			isDraft: pr.isDraft,
			updatedAt: pr.updatedAt,
			detail: `Requested ${timeAgo(pr.updatedAt)}`,
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
				category: "stale",
				repo: pr.repo,
				number: pr.number,
				title: pr.title,
				author: pr.author,
				url: pr.url,
				isDraft: pr.isDraft,
				updatedAt: pr.updatedAt,
				detail: `No activity for ${inactive} days`,
			});
		}
	}

	// 4. Your PRs waiting on others
	for (const pr of authoredPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;

		if (pr.requestedReviewers.length > 0) {
			seen.add(k);
			const reviewers = pr.requestedReviewers.map((r) => `@${r}`).join(", ");
			results.push({
				category: "waiting-on-others",
				repo: pr.repo,
				number: pr.number,
				title: pr.title,
				author: pr.author,
				url: pr.url,
				isDraft: pr.isDraft,
				updatedAt: pr.updatedAt,
				detail: `Waiting on review from ${reviewers}`,
			});
		}
	}

	// 5. All other open PRs (when showAllOpen is enabled)
	for (const pr of allOpenPRs) {
		const k = key(pr);
		if (seen.has(k)) continue;
		seen.add(k);

		results.push({
			category: "open",
			repo: pr.repo,
			number: pr.number,
			title: pr.title,
			author: pr.author,
			url: pr.url,
			isDraft: pr.isDraft,
			updatedAt: pr.updatedAt,
			detail: `Last commit ${timeAgo(pr.latestCommitAt)}`,
		});
	}

	return results;
}
