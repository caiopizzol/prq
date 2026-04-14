import { linearGraphQL } from "./client.js";
import type { LinearIssue } from "./types.js";

interface AssignedIssuesResponse {
	viewer: {
		assignedIssues: {
			nodes: Array<{
				id: string;
				identifier: string;
				number: number;
				title: string;
				url: string;
				updatedAt: string;
				team: { key: string };
				state: { name: string; type: string };
				creator: { displayName: string } | null;
				labels: { nodes: Array<{ name: string }> };
			}>;
		};
	};
}

const ASSIGNED_ISSUES_QUERY = `
  query AssignedIssues {
    viewer {
      assignedIssues(
        first: 100
        filter: { state: { type: { nin: ["completed", "canceled"] } } }
      ) {
        nodes {
          id
          identifier
          number
          title
          url
          updatedAt
          team { key }
          state { name type }
          creator { displayName }
          labels { nodes { name } }
        }
      }
    }
  }
`;

export async function fetchAssignedLinearIssues(): Promise<LinearIssue[]> {
	const data = await linearGraphQL<AssignedIssuesResponse>(
		ASSIGNED_ISSUES_QUERY,
	);
	return data.viewer.assignedIssues.nodes.map((n) => ({
		id: n.id,
		identifier: n.identifier,
		number: n.number,
		title: n.title,
		url: n.url,
		updatedAt: n.updatedAt,
		teamKey: n.team.key,
		stateName: n.state.name,
		stateType: n.state.type,
		creator: n.creator?.displayName ?? "unknown",
		labels: n.labels.nodes.map((l) => l.name),
	}));
}
