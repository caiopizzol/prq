import { categorize } from "../categorize.js";
import type { Config } from "../config.js";
import { getAuthenticatedUser } from "../github/client.js";
import {
	enrichAllWithReviews,
	fetchAuthoredPRs,
	fetchRequestedPRs,
	fetchReviewedPRs,
} from "../github/queries.js";
import { formatStatus } from "../output.js";
import type { StatusResult } from "../types.js";

export async function statusCommand(
	config: Config,
	json: boolean,
): Promise<void> {
	const user = config.user ?? (await getAuthenticatedUser());

	process.stderr.write(`Fetching PRs for ${user}...\n`);

	// Phase 1: Discovery (parallel search queries)
	const [reviewedRaw, requestedPRs, authoredPRs] = await Promise.all([
		fetchReviewedPRs(user, config.repos),
		fetchRequestedPRs(user, config.repos),
		fetchAuthoredPRs(user, config.repos),
	]);

	process.stderr.write(
		`Found ${reviewedRaw.length} reviewed, ${requestedPRs.length} requested, ${authoredPRs.length} authored\n`,
	);

	// Phase 2: Enrich reviewed PRs with review/commit timestamps
	const reviewedPRs = await enrichAllWithReviews(reviewedRaw, user);

	// Phase 3: Categorize
	const prs = categorize(
		reviewedPRs,
		requestedPRs,
		authoredPRs,
		config.staleDays,
	);

	const result: StatusResult = {
		user,
		timestamp: new Date().toISOString(),
		prs,
	};

	if (json) {
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	} else {
		process.stdout.write(formatStatus(result));
	}
}
