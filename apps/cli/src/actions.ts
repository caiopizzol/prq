import { spawn } from "node:child_process";
import type { Config } from "./config.js";
import type { ResolvedPR } from "./identifier.js";
import { markNudged } from "./state.js";

export interface ActionContext {
	url: string;
	number: number;
	owner: string;
	repo: string;
	fullRepo: string;
	title: string;
	author: string;
	days: number;
	category: string;
	target: string;
}

const DEFAULT_ACTIONS: Record<string, string> = {
	open: "open {url}",
	review: "open {url}/files",
	nudge:
		"gh pr comment {number} --repo {owner}/{repo} --body 'Hey {target}, this PR has had no activity for {days} days.'",
};

export function getAction(name: string, config: Config): string | undefined {
	return config.actions[name] ?? DEFAULT_ACTIONS[name];
}

export function listActions(config: Config): Record<string, string> {
	return { ...DEFAULT_ACTIONS, ...config.actions };
}

function parseDaysFromDetail(detail: string): number | null {
	const match = detail.match(/(\d+)d ago/);
	if (match) return Number.parseInt(match[1], 10);
	const daysMatch = detail.match(/(\d+) days?/);
	if (daysMatch) return Number.parseInt(daysMatch[1], 10);
	if (detail.includes("ago")) return 0;
	return null;
}

export function buildContext(
	pr: ResolvedPR,
	category = "",
	detail = "",
): ActionContext {
	const days =
		parseDaysFromDetail(detail) ??
		Math.floor(
			(Date.now() - new Date(pr.updatedAt || Date.now()).getTime()) /
				86_400_000,
		);

	// For waiting-on-others, target the reviewers instead of the author
	let target = `@${pr.author}`;
	if (category === "waiting-on-others" && detail) {
		const match = detail.match(/@\w[\w-]*/g);
		if (match) target = match.join(", ");
	}

	return {
		url: pr.url,
		number: pr.number,
		owner: pr.owner,
		repo: pr.repo,
		fullRepo: `${pr.owner}/${pr.repo}`,
		title: pr.title,
		author: pr.author,
		days,
		category,
		target,
	};
}

export function interpolate(template: string, context: ActionContext): string {
	return template.replace(/\{(\w+)\}/g, (match, key) => {
		if (key in context) {
			return String(context[key as keyof ActionContext]);
		}
		return match;
	});
}

const ACTION_HOOKS: Record<string, (context: ActionContext) => void> = {
	nudge: (ctx) => markNudged({ repo: ctx.fullRepo, number: ctx.number }),
};

export function runActionWithHooks(
	actionName: string,
	command: string,
	context: ActionContext,
): Promise<void> {
	return executeCommand(command).then(() => {
		ACTION_HOOKS[actionName]?.(context);
	});
}

export function executeCommand(command: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, {
			shell: true,
			stdio: "inherit",
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`Command exited with code ${code}`));
		});
	});
}
