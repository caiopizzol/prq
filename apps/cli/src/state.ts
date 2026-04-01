import fs from "node:fs";
import path from "node:path";
import type { CategorizedItem } from "./types.js";

const STATE_DIR = path.join(
	process.env.HOME ?? process.env.USERPROFILE ?? "",
	".config",
	"prq",
);
const STATE_PATH = path.join(STATE_DIR, "state.json");

interface PRState {
	inProgress?: string | boolean; // ISO timestamp (new) or true (legacy)
	nudgedAt?: string;
}

type StateData = Record<string, PRState>;

function itemKey(item: { repo: string; number: number }): string {
	return `${item.repo}#${item.number}`;
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

export function toggleInProgress(item: CategorizedItem): boolean {
	const state = load();
	const k = itemKey(item);
	const entry = state[k] ?? {};
	if (entry.inProgress) {
		delete entry.inProgress;
		state[k] = entry;
	} else {
		state[k] = { ...entry, inProgress: new Date().toISOString() };
	}
	save(state);
	return !!state[k]?.inProgress;
}

export function applyInProgress(
	items: CategorizedItem[],
	reviewTimestamps?: Map<string, string>,
): CategorizedItem[] {
	const state = load();
	const inProgressKeys = new Map(
		Object.entries(state)
			.filter(([, v]) => v.inProgress)
			.map(([k, v]) => [k, v.inProgress as string | boolean]),
	);
	if (inProgressKeys.size === 0) return items;

	let changed = false;

	// Auto-clear: if user submitted a review after marking in-progress
	if (reviewTimestamps) {
		for (const [k, startedAt] of Array.from(inProgressKeys)) {
			if (typeof startedAt !== "string") continue; // legacy boolean, skip
			const reviewedAt = reviewTimestamps.get(k);
			if (
				reviewedAt &&
				new Date(reviewedAt).getTime() > new Date(startedAt).getTime()
			) {
				delete state[k]?.inProgress;
				inProgressKeys.delete(k);
				changed = true;
			}
		}
	}

	// Clean up keys for items no longer in the queue (merged/closed)
	const activeKeys = new Set(items.map(itemKey));
	for (const k of Array.from(inProgressKeys.keys())) {
		if (!activeKeys.has(k)) {
			delete state[k]?.inProgress;
			changed = true;
		}
	}
	if (changed) save(state);

	return items.map((item) =>
		inProgressKeys.has(itemKey(item))
			? { ...item, category: "in-progress" as const }
			: item,
	);
}

export function applyNudged(items: CategorizedItem[]): CategorizedItem[] {
	const state = load();
	const nudgedKeys = new Map(
		Object.entries(state)
			.filter(([, v]) => v.nudgedAt)
			.map(([k, v]) => [k, v.nudgedAt as string]),
	);
	if (nudgedKeys.size === 0) return items;

	// Clean up nudgedAt for items no longer in the queue (merged/closed)
	const activeKeys = new Set(items.map(itemKey));
	let changed = false;
	for (const k of Array.from(nudgedKeys.keys())) {
		if (!activeKeys.has(k)) {
			delete state[k]?.nudgedAt;
			changed = true;
		}
	}
	if (changed) save(state);

	return items.map((item) => {
		const nudgedAt = nudgedKeys.get(itemKey(item));
		if (!nudgedAt) return item;
		// Don't override in-progress
		if (item.category === "in-progress") return item;
		const days = Math.floor(
			(Date.now() - new Date(nudgedAt).getTime()) / 86_400_000,
		);
		const ago = days === 0 ? "today" : `${days}d ago`;
		return { ...item, category: "nudged" as const, detail: `Nudged ${ago}` };
	});
}

// --- Nudge ---

export function getNudgedAt(item: {
	repo: string;
	number: number;
}): string | null {
	const state = load();
	return state[itemKey(item)]?.nudgedAt ?? null;
}

export function markNudged(item: { repo: string; number: number }): void {
	const state = load();
	const k = itemKey(item);
	state[k] = { ...state[k], nudgedAt: new Date().toISOString() };
	save(state);
}
