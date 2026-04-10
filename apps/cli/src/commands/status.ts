import { sortByCategory } from "../categories.js";
import { categorize, categorizeIssues } from "../categorize.js";
import type { Config } from "../config.js";
import { applyFilter, parseFilterFlags } from "../filter.js";
import { getAuthenticatedUser } from "../github/client.js";
import {
	enrichAllIssuesWithComments,
	enrichAllWithCommits,
	enrichAllWithReviews,
	fetchAllOpenPRs,
	fetchAssignedIssues,
	fetchAuthoredPRs,
	fetchMentionedIssues,
	fetchRequestedPRs,
	fetchReviewedPRs,
} from "../github/queries.js";
import type { PRBasic } from "../github/types.js";
import { interactiveMode } from "../interactive.js";
import { formatStatus } from "../output.js";
import { applyInProgress, applyNudged } from "../state.js";
import type { CategorizedItem, StatusResult } from "../types.js";

export interface QueueResult {
	user: string;
	items: CategorizedItem[];
}

export async function fetchQueue(config: Config): Promise<QueueResult> {
	const user = config.user ?? (await getAuthenticatedUser());

	process.stderr.write(`Fetching PRs and issues for ${user}...\n`);

	// Phase 1: Discovery (parallel search queries for PRs AND issues)
	const [
		reviewedRaw,
		requestedPRs,
		authoredPRs,
		allOpenPRs,
		assignedIssuesRaw,
		mentionedIssuesRaw,
	] = await Promise.all([
		fetchReviewedPRs(user, config.repos),
		fetchRequestedPRs(user, config.repos),
		fetchAuthoredPRs(user, config.repos),
		config.showAllOpen
			? fetchAllOpenPRs(config.repos)
			: Promise.resolve([] as PRBasic[]),
		fetchAssignedIssues(user, config.repos),
		fetchMentionedIssues(user, config.repos),
	]);

	const parts = [
		`${reviewedRaw.length} reviewed`,
		`${requestedPRs.length} requested`,
		`${authoredPRs.length} authored`,
	];
	if (config.showAllOpen) parts.push(`${allOpenPRs.length} open`);
	parts.push(`${assignedIssuesRaw.length} assigned issues`);
	if (mentionedIssuesRaw.length > 0)
		parts.push(`${mentionedIssuesRaw.length} mentioned issues`);
	process.stderr.write(`Found ${parts.join(", ")}\n`);

	// Phase 2: Enrich (parallel)
	const [reviewedPRs, openPRsEnriched, assignedIssues, mentionedIssues] =
		await Promise.all([
			enrichAllWithReviews(reviewedRaw, user),
			config.showAllOpen
				? enrichAllWithCommits(allOpenPRs)
				: Promise.resolve([]),
			enrichAllIssuesWithComments(assignedIssuesRaw, user),
			enrichAllIssuesWithComments(mentionedIssuesRaw, user),
		]);

	// Phase 3: Categorize (PRs and issues separately, then merge)
	const categorizedPRs = categorize(
		reviewedPRs,
		requestedPRs,
		authoredPRs,
		config.staleDays,
		openPRsEnriched,
	);
	const categorizedIssues = categorizeIssues(
		assignedIssues,
		mentionedIssues,
		config.staleDays,
	);
	const allCategorized = [...categorizedPRs, ...categorizedIssues];

	// Phase 4: Apply local state overlays
	const reviewTimestamps = new Map<string, string>();
	for (const pr of reviewedPRs) {
		reviewTimestamps.set(`${pr.repo}#${pr.number}`, pr.userLastReviewedAt);
	}
	const items = sortByCategory(
		applyNudged(applyInProgress(allCategorized, reviewTimestamps)),
	);

	return { user, items };
}

export async function statusCommand(
	config: Config,
	json: boolean,
	interactive: boolean,
	filterFlags?: string[],
): Promise<void> {
	const { user, items } = await fetchQueue(config);

	const filterSource = filterFlags ?? config.filters;
	const filter = parseFilterFlags(filterSource);
	const filtered = applyFilter(items, filter);

	const result: StatusResult = {
		user,
		timestamp: new Date().toISOString(),
		items: filtered,
	};

	if (json) {
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	} else if (interactive && process.stdin.isTTY) {
		await interactiveMode(result, filtered, config);
	} else {
		process.stdout.write(formatStatus(result));
	}
}
