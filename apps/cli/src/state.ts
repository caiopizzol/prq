import fs from "node:fs";
import path from "node:path";
import type { CategorizedPR } from "./types.js";

const STATE_DIR = path.join(
	process.env.HOME ?? process.env.USERPROFILE ?? "",
	".config",
	"prq",
);
const STATE_PATH = path.join(STATE_DIR, "in-progress.json");

function prKey(pr: { repo: string; number: number }): string {
	return `${pr.repo}#${pr.number}`;
}

export function loadInProgress(): Set<string> {
	try {
		const data = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
		return new Set(Array.isArray(data) ? data : []);
	} catch {
		return new Set();
	}
}

function save(keys: Set<string>): void {
	fs.mkdirSync(STATE_DIR, { recursive: true });
	fs.writeFileSync(STATE_PATH, JSON.stringify(Array.from(keys), null, 2));
}

export function toggleInProgress(pr: CategorizedPR): boolean {
	const keys = loadInProgress();
	const k = prKey(pr);
	if (keys.has(k)) {
		keys.delete(k);
		save(keys);
		return false;
	}
	keys.add(k);
	save(keys);
	return true;
}

export function applyInProgress(prs: CategorizedPR[]): CategorizedPR[] {
	const keys = loadInProgress();
	if (keys.size === 0) return prs;

	// Clean up keys for PRs no longer in the queue (merged/closed)
	const activeKeys = new Set(prs.map(prKey));
	const staleKeys = Array.from(keys).filter((k) => !activeKeys.has(k));
	if (staleKeys.length > 0) {
		for (const k of staleKeys) keys.delete(k);
		save(keys);
	}

	return prs.map((pr) =>
		keys.has(prKey(pr)) ? { ...pr, category: "in-progress" as const } : pr,
	);
}
