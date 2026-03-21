import { spawn } from "node:child_process";
import type { Config } from "./config.js";
import type { ResolvedPR } from "./identifier.js";

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
}

const DEFAULT_ACTIONS: Record<string, string> = {
	open: "open {url}",
	review: "open {url}/files",
	nudge:
		"gh pr comment {number} --repo {owner}/{repo} --body 'Hey @{author}, is this PR still active? No activity for {days} days.'",
};

export function getAction(name: string, config: Config): string | undefined {
	return config.actions[name] ?? DEFAULT_ACTIONS[name];
}

export function listActions(config: Config): Record<string, string> {
	return { ...DEFAULT_ACTIONS, ...config.actions };
}

export function buildContext(pr: ResolvedPR, category = ""): ActionContext {
	const days = Math.floor(
		(Date.now() - new Date(pr.updatedAt || Date.now()).getTime()) / 86_400_000,
	);
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
