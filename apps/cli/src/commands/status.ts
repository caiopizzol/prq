import { categorize } from "../categorize.js";
import type { Config } from "../config.js";
import { getAuthenticatedUser } from "../github/client.js";
import {
	enrichAllWithReviews,
	fetchAllOpenPRs,
	fetchAuthoredPRs,
	fetchRequestedPRs,
	fetchReviewedPRs,
} from "../github/queries.js";
import type { PRBasic } from "../github/types.js";
import { interactiveMode } from "../interactive.js";
import { formatStatus } from "../output.js";
import { applyInProgress } from "../state.js";
import type { StatusResult } from "../types.js";

export async function statusCommand(
	config: Config,
	json: boolean,
	interactive: boolean,
): Promise<void> {
	const user = config.user ?? (await getAuthenticatedUser());

	process.stderr.write(`Fetching PRs for ${user}...\n`);

	// Phase 1: Discovery (parallel search queries)
	const [reviewedRaw, requestedPRs, authoredPRs, allOpenPRs] =
		await Promise.all([
			fetchReviewedPRs(user, config.repos),
			fetchRequestedPRs(user, config.repos),
			fetchAuthoredPRs(user, config.repos),
			config.showAllOpen
				? fetchAllOpenPRs(config.repos)
				: Promise.resolve([] as PRBasic[]),
		]);

	const parts = [
		`${reviewedRaw.length} reviewed`,
		`${requestedPRs.length} requested`,
		`${authoredPRs.length} authored`,
	];
	if (config.showAllOpen) parts.push(`${allOpenPRs.length} open`);
	process.stderr.write(`Found ${parts.join(", ")}\n`);

	// Phase 2: Enrich reviewed PRs with review/commit timestamps
	const reviewedPRs = await enrichAllWithReviews(reviewedRaw, user);

	// Phase 3: Categorize
	const categorized = categorize(
		reviewedPRs,
		requestedPRs,
		authoredPRs,
		config.staleDays,
		config.showAllOpen ? allOpenPRs : [],
	);

	// Phase 4: Apply local in-progress state
	const prs = applyInProgress(categorized);

	const result: StatusResult = {
		user,
		timestamp: new Date().toISOString(),
		prs,
	};

	if (json) {
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
	} else if (interactive && process.stdin.isTTY) {
		await interactiveMode(result, categorized, config);
	} else {
		process.stdout.write(formatStatus(result));
	}
}
