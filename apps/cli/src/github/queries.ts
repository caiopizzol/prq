import { getClient } from "./client.js";
import type {
	IssueBasic,
	IssueWithComments,
	PRBasic,
	PRWithCommit,
	PRWithReviews,
} from "./types.js";

function buildRepoFilter(repos: string[]): string {
	if (repos.length === 0) return "";
	return repos.map((r) => `repo:${r}`).join(" ");
}

function parsePR(item: Record<string, unknown>): PRBasic {
	const user = item.user as Record<string, unknown>;
	const [owner, repo] = (item.repository_url as string).split("/").slice(-2);
	const rawLabels = (item.labels as Array<Record<string, unknown>>) ?? [];
	return {
		number: item.number as number,
		title: item.title as string,
		author: user.login as string,
		repo: `${owner}/${repo}`,
		url: item.html_url as string,
		isDraft: (item.draft as boolean) ?? false,
		updatedAt: item.updated_at as string,
		requestedReviewers: [],
		labels: rawLabels.map((l) => l.name as string),
	};
}

function parseIssue(item: Record<string, unknown>): IssueBasic {
	const user = item.user as Record<string, unknown>;
	const [owner, repo] = (item.repository_url as string).split("/").slice(-2);
	const assignees = (item.assignees as Array<Record<string, unknown>>) ?? [];
	const rawLabels = (item.labels as Array<Record<string, unknown>>) ?? [];
	return {
		number: item.number as number,
		title: item.title as string,
		author: user.login as string,
		repo: `${owner}/${repo}`,
		url: item.html_url as string,
		updatedAt: item.updated_at as string,
		assignees: assignees.map((a) => a.login as string),
		labels: rawLabels.map((l) => l.name as string),
	};
}

async function searchPRs(query: string): Promise<PRBasic[]> {
	const client = getClient();
	const { data } = await client.request("GET /search/issues", {
		q: query,
		per_page: 100,
		sort: "updated",
		order: "desc",
	});
	if (data.total_count > data.items.length) {
		process.stderr.write(
			`Warning: showing ${data.items.length} of ${data.total_count} results (sorted by most recently updated)\n`,
		);
	}
	return data.items.map(parsePR);
}

async function searchIssues(query: string): Promise<IssueBasic[]> {
	const client = getClient();
	const { data } = await client.request("GET /search/issues", {
		q: query,
		per_page: 100,
		sort: "updated",
		order: "desc",
	});
	if (data.total_count > data.items.length) {
		process.stderr.write(
			`Warning: showing ${data.items.length} of ${data.total_count} results (sorted by most recently updated)\n`,
		);
	}
	// Filter out PRs — the search/issues endpoint returns both
	return data.items
		.filter((item) => !(item as Record<string, unknown>).pull_request)
		.map(parseIssue);
}

// --- PR queries ---

export async function fetchReviewedPRs(
	user: string,
	repos: string[],
): Promise<PRBasic[]> {
	const repoFilter = buildRepoFilter(repos);
	const query =
		`is:pr is:open reviewed-by:${user} -author:${user} ${repoFilter}`.trim();
	return searchPRs(query);
}

export async function fetchRequestedPRs(
	user: string,
	repos: string[],
): Promise<PRBasic[]> {
	const repoFilter = buildRepoFilter(repos);
	const query = `is:pr is:open review-requested:${user} ${repoFilter}`.trim();
	return searchPRs(query);
}

export async function fetchAuthoredPRs(
	user: string,
	repos: string[],
): Promise<PRBasic[]> {
	const repoFilter = buildRepoFilter(repos);
	const query = `is:pr is:open author:${user} ${repoFilter}`.trim();
	const prs = await searchPRs(query);

	// Enrich with requested reviewers
	const client = getClient();
	const enriched = await Promise.all(
		prs.map(async (pr) => {
			try {
				const [owner, repo] = pr.repo.split("/");
				const { data } = await client.pulls.get({
					owner,
					repo,
					pull_number: pr.number,
				});
				return {
					...pr,
					requestedReviewers:
						data.requested_reviewers?.map((r) => r.login) ?? [],
				};
			} catch {
				return pr;
			}
		}),
	);

	return enriched;
}

export async function fetchAllOpenPRs(repos: string[]): Promise<PRBasic[]> {
	if (repos.length === 0) return [];
	const repoFilter = buildRepoFilter(repos);
	const query = `is:pr is:open ${repoFilter}`.trim();
	return searchPRs(query);
}

async function enrichWithLatestCommit(pr: PRBasic): Promise<PRWithCommit> {
	try {
		const client = getClient();
		const [owner, repo] = pr.repo.split("/");
		const { data: commits } = await client.pulls.listCommits({
			owner,
			repo,
			pull_number: pr.number,
			per_page: 1,
		});
		const latest = commits[commits.length - 1];
		const latestCommitAt =
			latest?.commit.committer?.date ??
			latest?.commit.author?.date ??
			pr.updatedAt;
		return { ...pr, latestCommitAt };
	} catch {
		return { ...pr, latestCommitAt: pr.updatedAt };
	}
}

export async function enrichAllWithCommits(
	prs: PRBasic[],
): Promise<PRWithCommit[]> {
	const results: PRWithCommit[] = [];
	for (let i = 0; i < prs.length; i += MAX_CONCURRENCY) {
		const batch = prs.slice(i, i + MAX_CONCURRENCY);
		const enriched = await Promise.all(
			batch.map((pr) => enrichWithLatestCommit(pr)),
		);
		results.push(...enriched);
	}
	return results;
}

export async function enrichWithReviews(
	pr: PRBasic,
	user: string,
): Promise<PRWithReviews | null> {
	try {
		const client = getClient();
		const [owner, repo] = pr.repo.split("/");

		const [reviewsRes, commitsRes] = await Promise.all([
			client.pulls.listReviews({
				owner,
				repo,
				pull_number: pr.number,
				per_page: 100,
			}),
			client.pulls.listCommits({
				owner,
				repo,
				pull_number: pr.number,
				per_page: 100,
			}),
		]);

		// Find user's latest review
		const userReviews = reviewsRes.data
			.filter(
				(r) =>
					r.user?.login === user &&
					r.state !== "PENDING" &&
					r.submitted_at != null,
			)
			.sort(
				(a, b) =>
					new Date(b.submitted_at as string).getTime() -
					new Date(a.submitted_at as string).getTime(),
			);

		if (userReviews.length === 0) return null;

		const userLastReviewedAt = userReviews[0].submitted_at as string;

		// Find latest commit by the PR author (ignore rebases/merges by others)
		const commits = commitsRes.data;
		const authorCommits = commits.filter((c) => c.author?.login === pr.author);
		const latestCommit =
			authorCommits.length > 0
				? authorCommits[authorCommits.length - 1]
				: commits[commits.length - 1];
		const latestCommitAt =
			latestCommit?.commit.committer?.date ??
			latestCommit?.commit.author?.date ??
			pr.updatedAt;

		return {
			...pr,
			userLastReviewedAt,
			latestCommitAt,
			latestAuthorCommentAt: null,
		};
	} catch {
		return null;
	}
}

const MAX_CONCURRENCY = 10;

export async function enrichAllWithReviews(
	prs: PRBasic[],
	user: string,
): Promise<PRWithReviews[]> {
	const results: PRWithReviews[] = [];

	for (let i = 0; i < prs.length; i += MAX_CONCURRENCY) {
		const batch = prs.slice(i, i + MAX_CONCURRENCY);
		const enriched = await Promise.all(
			batch.map((pr) => enrichWithReviews(pr, user)),
		);
		for (const r of enriched) {
			if (r) results.push(r);
		}
	}

	return results;
}

// --- Issue queries ---

export async function fetchAssignedIssues(
	user: string,
	repos: string[],
): Promise<IssueBasic[]> {
	const repoFilter = buildRepoFilter(repos);
	const query = `is:issue is:open assignee:${user} ${repoFilter}`.trim();
	return searchIssues(query);
}

export async function fetchMentionedIssues(
	user: string,
	repos: string[],
): Promise<IssueBasic[]> {
	const repoFilter = buildRepoFilter(repos);
	const query =
		`is:issue is:open mentions:${user} -assignee:${user} ${repoFilter}`.trim();
	return searchIssues(query);
}

async function enrichIssueWithComments(
	issue: IssueBasic,
	user: string,
): Promise<IssueWithComments> {
	try {
		const client = getClient();
		const [owner, repo] = issue.repo.split("/");
		const { data: comments } = await client.issues.listComments({
			owner,
			repo,
			issue_number: issue.number,
			per_page: 100,
			sort: "created",
			direction: "desc",
		});

		let userLastCommentAt: string | null = null;
		let latestOtherComment: { id: number; created_at: string } | null = null;

		for (const comment of comments) {
			const login = comment.user?.login;
			const isBot =
				(comment.user as Record<string, unknown>)?.type === "Bot" ||
				(login?.endsWith("[bot]") ?? false);

			if (login === user && !userLastCommentAt) {
				userLastCommentAt = comment.created_at;
			} else if (login !== user && !isBot && !latestOtherComment) {
				latestOtherComment = {
					id: comment.id,
					created_at: comment.created_at,
				};
			}
			if (userLastCommentAt && latestOtherComment) break;
		}

		// Check if user reacted to the latest non-bot comment (counts as acknowledgment)
		let userReactedToLatest = false;
		if (latestOtherComment) {
			try {
				const { data: reactions } = await client.reactions.listForIssueComment({
					owner,
					repo,
					comment_id: latestOtherComment.id,
					per_page: 100,
				});
				userReactedToLatest = reactions.some((r) => r.user?.login === user);
			} catch {
				// If we can't fetch reactions, treat as no reaction
			}
		}

		const latestOtherCommentAt = latestOtherComment?.created_at ?? null;

		// If user reacted to the latest comment, treat it as if they responded
		// Add 1ms so the reaction timestamp is strictly after the comment (avoids equality edge case)
		const effectiveUserLastCommentAt =
			userReactedToLatest && latestOtherComment
				? new Date(
						new Date(latestOtherComment.created_at).getTime() + 1,
					).toISOString()
				: userLastCommentAt;

		return {
			...issue,
			userLastCommentAt: effectiveUserLastCommentAt,
			latestOtherCommentAt,
		};
	} catch {
		process.stderr.write(
			`Warning: failed to fetch comments for ${issue.repo}#${issue.number}\n`,
		);
		return { ...issue, userLastCommentAt: null, latestOtherCommentAt: null };
	}
}

export async function enrichAllIssuesWithComments(
	issues: IssueBasic[],
	user: string,
): Promise<IssueWithComments[]> {
	const results: IssueWithComments[] = [];
	for (let i = 0; i < issues.length; i += MAX_CONCURRENCY) {
		const batch = issues.slice(i, i + MAX_CONCURRENCY);
		const enriched = await Promise.all(
			batch.map((issue) => enrichIssueWithComments(issue, user)),
		);
		results.push(...enriched);
	}
	return results;
}
