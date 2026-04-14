const LINEAR_API_URL = "https://api.linear.app/graphql";

export function getLinearApiKey(): string | null {
	return process.env.LINEAR_API_KEY?.trim() || null;
}

export function isLinearEnabled(): boolean {
	return getLinearApiKey() !== null;
}

export async function linearGraphQL<T>(
	query: string,
	variables: Record<string, unknown> = {},
): Promise<T> {
	const apiKey = getLinearApiKey();
	if (!apiKey) {
		throw new Error(
			"LINEAR_API_KEY not set. Generate one at linear.app/settings/api.",
		);
	}

	const res = await fetch(LINEAR_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: apiKey,
		},
		body: JSON.stringify({ query, variables }),
	});

	if (!res.ok) {
		throw new Error(`Linear API error: ${res.status} ${res.statusText}`);
	}

	const json = (await res.json()) as {
		data?: T;
		errors?: { message: string }[];
	};
	if (json.errors?.length) {
		throw new Error(
			`Linear API error: ${json.errors.map((e) => e.message).join("; ")}`,
		);
	}
	if (!json.data) {
		throw new Error("Linear API returned no data");
	}
	return json.data;
}
