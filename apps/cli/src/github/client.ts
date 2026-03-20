import { execSync } from "node:child_process";
import { Octokit } from "@octokit/rest";

let cachedClient: Octokit | null = null;

export function getClient(): Octokit {
	if (cachedClient) return cachedClient;

	let token: string | undefined;

	try {
		token = execSync("gh auth token", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		}).trim();
	} catch {
		token = process.env.GITHUB_TOKEN;
	}

	if (!token) {
		throw new Error(
			"No GitHub token found. Run `gh auth login` or set GITHUB_TOKEN.",
		);
	}

	cachedClient = new Octokit({ auth: token });
	return cachedClient;
}

export async function getAuthenticatedUser(): Promise<string> {
	const client = getClient();
	const { data } = await client.users.getAuthenticated();
	return data.login;
}
