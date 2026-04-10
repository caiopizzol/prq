import type { CategorizedItem } from "./types.js";

/** A single parsed filter clause from one --filter flag. */
export interface FilterClause {
	key: string;
	values: string[];
	exclude: boolean;
}

/** A complete filter: all clauses must match (AND). */
export type Filter = FilterClause[];

interface FilterKeyDef {
	extract: (item: CategorizedItem) => string[];
}

const FILTER_KEYS: Record<string, FilterKeyDef> = {
	label: { extract: (item) => item.labels },
	author: { extract: (item) => [item.author] },
	type: { extract: (item) => [item.type] },
	category: { extract: (item) => [item.category] },
	repo: { extract: (item) => [item.repo] },
	draft: { extract: (item) => [String(item.isDraft)] },
};

export const FILTER_KEY_NAMES = Object.keys(FILTER_KEYS).sort();

/**
 * Parse a single --filter flag into a FilterClause.
 *
 * Format: [!]key:value[,value...]
 * Examples: "label:priority", "!author:bot", "label:priority,urgent"
 */
export function parseFilterFlag(flag: string): FilterClause {
	let exclude = false;
	let rest = flag;

	if (rest.startsWith("!")) {
		exclude = true;
		rest = rest.slice(1);
	}

	const colonIdx = rest.indexOf(":");
	if (colonIdx < 0) {
		throw new Error(
			`Invalid filter syntax "${flag}". Expected format: key:value (e.g., label:priority, !author:bot)`,
		);
	}

	const key = rest.slice(0, colonIdx).toLowerCase();
	const rawValue = rest.slice(colonIdx + 1);

	if (!FILTER_KEYS[key]) {
		throw new Error(
			`Unknown filter key "${key}". Valid keys: ${FILTER_KEY_NAMES.join(", ")}`,
		);
	}

	const values = rawValue
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

	if (values.length === 0) {
		throw new Error(
			`Invalid filter "${flag}". No value provided after "${key}:".`,
		);
	}

	return { key, values, exclude };
}

export function parseFilterFlags(flags: string[]): Filter {
	return flags.map(parseFilterFlag);
}

export function matchesFilter(item: CategorizedItem, filter: Filter): boolean {
	for (const clause of filter) {
		const def = FILTER_KEYS[clause.key];
		if (!def) continue;

		const itemValues = def.extract(item).map((v) => v.toLowerCase());

		if (clause.exclude) {
			if (clause.values.some((v) => itemValues.includes(v))) return false;
		} else {
			if (!clause.values.some((v) => itemValues.includes(v))) return false;
		}
	}
	return true;
}

export function applyFilter(
	items: CategorizedItem[],
	filter: Filter,
): CategorizedItem[] {
	if (filter.length === 0) return items;
	return items.filter((item) => matchesFilter(item, filter));
}

/** Convert batch command's legacy flags to a Filter. */
export function legacyOptsToFilter(opts: {
	author?: string;
	category?: string;
	repo?: string;
	type?: string;
}): Filter {
	const clauses: Filter = [];

	if (opts.author) {
		clauses.push({
			key: "author",
			values: [opts.author.replace(/^@/, "").toLowerCase()],
			exclude: false,
		});
	}
	if (opts.category) {
		clauses.push({
			key: "category",
			values: [opts.category.toLowerCase()],
			exclude: false,
		});
	}
	if (opts.repo) {
		clauses.push({
			key: "repo",
			values: [opts.repo.toLowerCase()],
			exclude: false,
		});
	}
	if (opts.type) {
		clauses.push({
			key: "type",
			values: [opts.type.toLowerCase()],
			exclude: false,
		});
	}

	return clauses;
}

/** Collect all unique values for a filter key across items. */
export function collectFilterValues(
	items: CategorizedItem[],
	key: string,
): string[] {
	const def = FILTER_KEYS[key];
	if (!def) return [];

	const set = new Set<string>();
	for (const item of items) {
		for (const val of def.extract(item)) {
			set.add(val);
		}
	}
	return Array.from(set).sort((a, b) => a.localeCompare(b));
}
