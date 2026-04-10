export type ItemType = "pr" | "issue";

export type ItemCategory =
	| "in-progress"
	| "nudged"
	| "needs-re-review"
	| "open"
	| "requested"
	| "stale"
	| "waiting-on-others"
	| "mentioned";

export interface CategorizedItem {
	type: ItemType;
	category: ItemCategory;
	repo: string;
	number: number;
	title: string;
	author: string;
	url: string;
	isDraft: boolean;
	updatedAt: string;
	detail: string;
	labels: string[];
}

export interface StatusResult {
	user: string;
	timestamp: string;
	items: CategorizedItem[];
}
