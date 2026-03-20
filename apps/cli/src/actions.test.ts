import { describe, expect, test } from "bun:test";
import {
	buildContext,
	getAction,
	interpolate,
	listActions,
} from "./actions.js";
import type { ResolvedPR } from "./identifier.js";

const pr: ResolvedPR = {
	owner: "org",
	repo: "repo",
	number: 42,
	url: "https://github.com/org/repo/pull/42",
	title: "fix: something",
	author: "alice",
	updatedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
};

describe("interpolate", () => {
	test("replaces all variables", () => {
		const ctx = buildContext(pr);
		const result = interpolate("open {url}/files", ctx);
		expect(result).toBe("open https://github.com/org/repo/pull/42/files");
	});

	test("replaces number and repo", () => {
		const ctx = buildContext(pr);
		const result = interpolate(
			"gh pr comment {number} --repo {owner}/{repo}",
			ctx,
		);
		expect(result).toBe("gh pr comment 42 --repo org/repo");
	});

	test("replaces fullRepo", () => {
		const ctx = buildContext(pr);
		const result = interpolate("{fullRepo}#{number}", ctx);
		expect(result).toBe("org/repo#42");
	});

	test("replaces author and title", () => {
		const ctx = buildContext(pr);
		const result = interpolate("@{author}: {title}", ctx);
		expect(result).toBe("@alice: fix: something");
	});

	test("leaves unknown variables untouched", () => {
		const ctx = buildContext(pr);
		const result = interpolate("{unknown} stays", ctx);
		expect(result).toBe("{unknown} stays");
	});

	test("computes days from updatedAt", () => {
		const ctx = buildContext(pr);
		expect(ctx.days).toBe(5);
	});
});

describe("getAction", () => {
	test("returns default action", () => {
		const config = { repos: [], staleDays: 3, actions: {} };
		expect(getAction("open", config)).toBe("open {url}");
		expect(getAction("review", config)).toBe("open {url}/files");
	});

	test("user config overrides default", () => {
		const config = {
			repos: [],
			staleDays: 3,
			actions: { review: "claude -p '/review {url}'" },
		};
		expect(getAction("review", config)).toBe("claude -p '/review {url}'");
	});

	test("returns custom action", () => {
		const config = {
			repos: [],
			staleDays: 3,
			actions: { checkout: "gh pr checkout {number}" },
		};
		expect(getAction("checkout", config)).toBe("gh pr checkout {number}");
	});

	test("returns undefined for unknown action", () => {
		const config = { repos: [], staleDays: 3, actions: {} };
		expect(getAction("nonexistent", config)).toBeUndefined();
	});
});

describe("listActions", () => {
	test("merges defaults with user actions", () => {
		const config = {
			repos: [],
			staleDays: 3,
			actions: { checkout: "gh pr checkout {number}" },
		};
		const all = listActions(config);
		expect(all.open).toBe("open {url}");
		expect(all.review).toBe("open {url}/files");
		expect(all.checkout).toBe("gh pr checkout {number}");
	});

	test("user overrides take precedence", () => {
		const config = {
			repos: [],
			staleDays: 3,
			actions: { open: "custom-open {url}" },
		};
		const all = listActions(config);
		expect(all.open).toBe("custom-open {url}");
	});
});
