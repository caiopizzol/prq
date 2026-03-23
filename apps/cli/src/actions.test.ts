import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
	buildContext,
	getAction,
	interpolate,
	listActions,
	runActionWithHooks,
} from "./actions.js";
import type { ResolvedPR } from "./identifier.js";
import { getNudgedAt } from "./state.js";

const STATE_PATH = path.join(
	process.env.HOME ?? "",
	".config",
	"prq",
	"state.json",
);

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

	test("computes days from updatedAt when no detail", () => {
		const ctx = buildContext(pr);
		expect(ctx.days).toBe(5);
	});

	test("extracts days from detail when available", () => {
		const ctx = buildContext(pr, "stale", "No activity for 30 days");
		expect(ctx.days).toBe(30);
	});

	test("extracts days from detail with d ago format", () => {
		const ctx = buildContext(pr, "open", "Last commit 11d ago");
		expect(ctx.days).toBe(11);
	});

	test("replaces category", () => {
		const ctx = buildContext(pr, "needs-re-review");
		const result = interpolate("script.sh {number} {category}", ctx);
		expect(result).toBe("script.sh 42 needs-re-review");
	});

	test("category defaults to empty string", () => {
		const ctx = buildContext(pr);
		expect(ctx.category).toBe("");
	});

	test("target defaults to @author", () => {
		const ctx = buildContext(pr);
		expect(ctx.target).toBe("@alice");
	});

	test("target uses reviewers for waiting-on-others", () => {
		const ctx = buildContext(
			pr,
			"waiting-on-others",
			"Waiting on review from @bob, @charlie",
		);
		expect(ctx.target).toBe("@bob, @charlie");
	});

	test("target falls back to @author when no reviewers in detail", () => {
		const ctx = buildContext(pr, "waiting-on-others", "some other detail");
		expect(ctx.target).toBe("@alice");
	});
});

describe("getAction", () => {
	test("returns default action", () => {
		const config = {
			repos: [],
			staleDays: 3,
			showAllOpen: false,
			actions: {},
			pageSize: 10,
		};
		expect(getAction("open", config)).toBe("open {url}");
		expect(getAction("review", config)).toBe("open {url}/files");
	});

	test("user config overrides default", () => {
		const config = {
			repos: [],
			staleDays: 3,
			showAllOpen: false,
			pageSize: 10,
			actions: { review: "claude -p '/review {url}'" },
		};
		expect(getAction("review", config)).toBe("claude -p '/review {url}'");
	});

	test("returns custom action", () => {
		const config = {
			repos: [],
			staleDays: 3,
			showAllOpen: false,
			pageSize: 10,
			actions: { checkout: "gh pr checkout {number}" },
		};
		expect(getAction("checkout", config)).toBe("gh pr checkout {number}");
	});

	test("returns undefined for unknown action", () => {
		const config = {
			repos: [],
			staleDays: 3,
			showAllOpen: false,
			actions: {},
			pageSize: 10,
		};
		expect(getAction("nonexistent", config)).toBeUndefined();
	});
});

describe("listActions", () => {
	test("merges defaults with user actions", () => {
		const config = {
			repos: [],
			staleDays: 3,
			showAllOpen: false,
			pageSize: 10,
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
			showAllOpen: false,
			pageSize: 10,
			actions: { open: "custom-open {url}" },
		};
		const all = listActions(config);
		expect(all.open).toBe("custom-open {url}");
	});
});

describe("runActionWithHooks", () => {
	afterEach(() => {
		try {
			fs.unlinkSync(STATE_PATH);
		} catch {}
	});

	test("nudge action records state on success", async () => {
		const ctx = buildContext(pr);
		await runActionWithHooks("nudge", "true", ctx);
		expect(getNudgedAt({ repo: "org/repo", number: 42 })).not.toBeNull();
	});

	test("nudge action does not record state on failure", async () => {
		const ctx = buildContext(pr);
		try {
			await runActionWithHooks("nudge", "false", ctx);
		} catch {}
		expect(getNudgedAt({ repo: "org/repo", number: 42 })).toBeNull();
	});

	test("non-nudge action does not record nudge state", async () => {
		const ctx = buildContext(pr);
		await runActionWithHooks("open", "true", ctx);
		expect(getNudgedAt({ repo: "org/repo", number: 42 })).toBeNull();
	});
});
