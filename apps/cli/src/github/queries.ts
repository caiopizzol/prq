import { getClient } from "./client.js";
import type { PRBasic, PRWithCommit, PRWithReviews } from "./types.js";

function buildRepoFilter(repos: string[]): string {
	if (repos.length === 0) return "";
	return repos.map((r) => `repo:${r}`).join(" ");
}

function parsePR(item: Record<string, unknown>): PRBasic {
	const user = item.user as Record<string, unknown>;
	const [owner, repo] = (item.repository_url as string).split("/").slice(-2);
	return {
		number: item.number as number,
		title: item.title as string,
		author: user.login as string,
		repo: `${owner}/${repo}`,
		url: item.html_url as string,
		isDraft: (item.draft as boolean) ?? false,
		updatedAt: item.updated_at as string,
		requestedReviewers: [],
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

		// Find latest commit
		const commits = commitsRes.data;
		const latestCommit = commits[commits.length - 1];
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
