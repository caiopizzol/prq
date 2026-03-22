import fs from "node:fs";
import path from "node:path";
import type { CategorizedPR } from "./types.js";

const STATE_DIR = path.join(
	process.env.HOME ?? process.env.USERPROFILE ?? "",
	".config",
	"prq",
);
const STATE_PATH = path.join(STATE_DIR, "state.json");

interface PRState {
	inProgress?: boolean;
	nudgedAt?: string;
}

type StateData = Record<string, PRState>;

function prKey(pr: { repo: string; number: number }): string {
	return `${pr.repo}#${pr.number}`;
}

function load(): StateData {
	try {
		const data = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
		return typeof data === "object" && data !== null && !Array.isArray(data)
			? data
			: {};
	} catch {
		return {};
	}
}

function save(state: StateData): void {
	fs.mkdirSync(STATE_DIR, { recursive: true });
	// Remove empty entries
	const clean: StateData = {};
	for (const [k, v] of Object.entries(state)) {
		if (v.inProgress || v.nudgedAt) clean[k] = v;
	}
	fs.writeFileSync(STATE_PATH, JSON.stringify(clean, null, 2));
}

// --- In-progress ---

export function loadInProgress(): Set<string> {
	const state = load();
	return new Set(
		Object.entries(state)
			.filter(([, v]) => v.inProgress)
			.map(([k]) => k),
	);
}

export function toggleInProgress(pr: CategorizedPR): boolean {
	const state = load();
	const k = prKey(pr);
	const entry = state[k] ?? {};
	if (entry.inProgress) {
		delete entry.inProgress;
		state[k] = entry;
	} else {
		state[k] = { ...entry, inProgress: true };
	}
	save(state);
	return !!state[k]?.inProgress;
}

export function applyInProgress(prs: CategorizedPR[]): CategorizedPR[] {
	const state = load();
	const inProgressKeys = new Set(
		Object.entries(state)
			.filter(([, v]) => v.inProgress)
			.map(([k]) => k),
	);
	if (inProgressKeys.size === 0) return prs;

	// Clean up keys for PRs no longer in the queue (merged/closed)
	const activeKeys = new Set(prs.map(prKey));
	let changed = false;
	for (const k of Array.from(inProgressKeys)) {
		if (!activeKeys.has(k)) {
			delete state[k]?.inProgress;
			changed = true;
		}
	}
	if (changed) save(state);

	return prs.map((pr) =>
		inProgressKeys.has(prKey(pr))
			? { ...pr, category: "in-progress" as const }
			: pr,
	);
}

// --- Nudge ---

export function getNudgedAt(pr: {
	repo: string;
	number: number;
}): string | null {
	const state = load();
	return state[prKey(pr)]?.nudgedAt ?? null;
}

export function markNudged(pr: { repo: string; number: number }): void {
	const state = load();
	const k = prKey(pr);
	state[k] = { ...state[k], nudgedAt: new Date().toISOString() };
	save(state);
}
