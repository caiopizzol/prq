import type { Config } from "./config.js";
import { getAuthenticatedUser, getClient } from "./github/client.js";
import {
	fetchAssignedIssues,
	fetchAuthoredPRs,
	fetchRequestedPRs,
	fetchReviewedPRs,
} from "./github/queries.js";
import type { PRBasic } from "./github/types.js";

export type ParsedIdentifier =
	| {
			kind: "url";
			owner: string;
			repo: string;
			number: number;
			type: "pr" | "issue";
	  }
	| { kind: "repo-number"; owner: string; repo: string; number: number }
	| { kind: "number-only"; number: number };

export interface ResolvedPR {
	owner: string;
	repo: string;
	number: number;
	url: string;
	title: string;
	author: string;
	updatedAt: string;
}

const PR_URL_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
const ISSUE_URL_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;
const REPO_NUMBER_RE = /^([^/]+\/[^#]+)#(\d+)$/;
const NUMBER_RE = /^\d+$/;

export function parseIdentifier(input: string): ParsedIdentifier {
	const prUrlMatch = input.match(PR_URL_RE);
	if (prUrlMatch) {
		return {
			kind: "url",
			owner: prUrlMatch[1],
			repo: prUrlMatch[2],
			number: Number.parseInt(prUrlMatch[3], 10),
			type: "pr",
		};
	}

	const issueUrlMatch = input.match(ISSUE_URL_RE);
	if (issueUrlMatch) {
		return {
			kind: "url",
			owner: issueUrlMatch[1],
			repo: issueUrlMatch[2],
			number: Number.parseInt(issueUrlMatch[3], 10),
			type: "issue",
		};
	}

	const repoMatch = input.match(REPO_NUMBER_RE);
	if (repoMatch) {
		const [owner, repo] = repoMatch[1].split("/");
		return {
			kind: "repo-number",
			owner,
			repo,
			number: Number.parseInt(repoMatch[2], 10),
		};
	}

	if (NUMBER_RE.test(input)) {
		return { kind: "number-only", number: Number.parseInt(input, 10) };
	}

	throw new Error(
		`Invalid identifier: "${input}"\nExamples: 482, org/repo#482, https://github.com/org/repo/pull/482, https://github.com/org/repo/issues/482`,
	);
}

export async function resolveIdentifier(
	input: string,
	config: Config,
): Promise<ResolvedPR> {
	const parsed = parseIdentifier(input);

	if (parsed.kind === "url") {
		const urlType = parsed.type === "issue" ? "issues" : "pull";
		return {
			owner: parsed.owner,
			repo: parsed.repo,
			number: parsed.number,
			url: `https://github.com/${parsed.owner}/${parsed.repo}/${urlType}/${parsed.number}`,
			title: "",
			author: "",
			updatedAt: "",
		};
	}

	if (parsed.kind === "repo-number") {
		// Detect if this is a PR or issue via the API
		let urlType = "pull";
		try {
			const client = getClient();
			const { data } = await client.issues.get({
				owner: parsed.owner,
				repo: parsed.repo,
				issue_number: parsed.number,
			});
			if (!(data as Record<string, unknown>).pull_request) {
				urlType = "issues";
			}
		} catch {
			// Fall back to PR URL if API call fails
		}
		return {
			owner: parsed.owner,
			repo: parsed.repo,
			number: parsed.number,
			url: `https://github.com/${parsed.owner}/${parsed.repo}/${urlType}/${parsed.number}`,
			title: "",
			author: "",
			updatedAt: "",
		};
	}

	// Number-only: search the user's queue
	return findItemByNumber(parsed.number, config);
}

async function findItemByNumber(
	itemNumber: number,
	config: Config,
): Promise<ResolvedPR> {
	const user = config.user ?? (await getAuthenticatedUser());

	process.stderr.write(`Searching for #${itemNumber}...\n`);

	const [reviewed, requested, authored, assignedIssues] = await Promise.all([
		fetchReviewedPRs(user, config.repos),
		fetchRequestedPRs(user, config.repos),
		fetchAuthoredPRs(user, config.repos),
		fetchAssignedIssues(user, config.repos),
	]);

	const seen = new Set<string>();
	const allItems: (PRBasic & { itemType?: string })[] = [];

	for (const pr of [...reviewed, ...requested, ...authored]) {
		const key = `${pr.repo}#${pr.number}`;
		if (!seen.has(key)) {
			seen.add(key);
			allItems.push(pr);
		}
	}
	for (const issue of assignedIssues) {
		const key = `${issue.repo}#${issue.number}`;
		if (!seen.has(key)) {
			seen.add(key);
			allItems.push({
				number: issue.number,
				title: issue.title,
				author: issue.author,
				repo: issue.repo,
				url: issue.url,
				isDraft: false,
				updatedAt: issue.updatedAt,
				requestedReviewers: [],
				itemType: "issue",
			});
		}
	}

	const matches = allItems.filter((item) => item.number === itemNumber);

	if (matches.length === 0) {
		throw new Error(
			`No #${itemNumber} found in your queue. Use the full format: org/repo#${itemNumber}`,
		);
	}

	if (matches.length > 1) {
		const options = matches
			.map((item) => `  ${item.repo}#${item.number}`)
			.join("\n");
		throw new Error(
			`Multiple items found with #${itemNumber}:\n${options}\nSpecify which one: prq open org/repo#${itemNumber}`,
		);
	}

	const item = matches[0];
	const [owner, repo] = item.repo.split("/");
	return {
		owner,
		repo,
		number: item.number,
		url: item.url,
		title: item.title,
		author: item.author,
		updatedAt: item.updatedAt,
	};
}
