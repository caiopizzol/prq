import type { Config } from "./config.js";
import { getAuthenticatedUser } from "./github/client.js";
import {
	fetchAuthoredPRs,
	fetchRequestedPRs,
	fetchReviewedPRs,
} from "./github/queries.js";
import type { PRBasic } from "./github/types.js";

export type ParsedIdentifier =
	| { kind: "url"; owner: string; repo: string; number: number }
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

const URL_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
const REPO_NUMBER_RE = /^([^/]+\/[^#]+)#(\d+)$/;
const NUMBER_RE = /^\d+$/;

export function parseIdentifier(input: string): ParsedIdentifier {
	const urlMatch = input.match(URL_RE);
	if (urlMatch) {
		return {
			kind: "url",
			owner: urlMatch[1],
			repo: urlMatch[2],
			number: Number.parseInt(urlMatch[3], 10),
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
		`Invalid PR identifier: "${input}"\nExamples: 482, org/repo#482, https://github.com/org/repo/pull/482`,
	);
}

export async function resolveIdentifier(
	input: string,
	config: Config,
): Promise<ResolvedPR> {
	const parsed = parseIdentifier(input);

	if (parsed.kind === "url" || parsed.kind === "repo-number") {
		return {
			owner: parsed.owner,
			repo: parsed.repo,
			number: parsed.number,
			url: `https://github.com/${parsed.owner}/${parsed.repo}/pull/${parsed.number}`,
			title: "",
			author: "",
			updatedAt: "",
		};
	}

	// Number-only: search the user's queue
	return findPRByNumber(parsed.number, config);
}

async function findPRByNumber(
	prNumber: number,
	config: Config,
): Promise<ResolvedPR> {
	const user = config.user ?? (await getAuthenticatedUser());

	process.stderr.write(`Searching for PR #${prNumber}...\n`);

	const [reviewed, requested, authored] = await Promise.all([
		fetchReviewedPRs(user, config.repos),
		fetchRequestedPRs(user, config.repos),
		fetchAuthoredPRs(user, config.repos),
	]);

	const seen = new Set<string>();
	const allPRs: PRBasic[] = [];
	for (const pr of [...reviewed, ...requested, ...authored]) {
		const key = `${pr.repo}#${pr.number}`;
		if (!seen.has(key)) {
			seen.add(key);
			allPRs.push(pr);
		}
	}

	const matches = allPRs.filter((pr) => pr.number === prNumber);

	if (matches.length === 0) {
		throw new Error(
			`No PR #${prNumber} found in your queue. Use the full format: org/repo#${prNumber}`,
		);
	}

	if (matches.length > 1) {
		const options = matches.map((pr) => `  ${pr.repo}#${pr.number}`).join("\n");
		throw new Error(
			`Multiple PRs found with #${prNumber}:\n${options}\nSpecify which one: prq open org/repo#${prNumber}`,
		);
	}

	const pr = matches[0];
	const [owner, repo] = pr.repo.split("/");
	return {
		owner,
		repo,
		number: pr.number,
		url: pr.url,
		title: pr.title,
		author: pr.author,
		updatedAt: pr.updatedAt,
	};
}
