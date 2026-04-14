export interface LinearIssue {
	id: string;
	identifier: string;
	number: number;
	title: string;
	url: string;
	updatedAt: string;
	teamKey: string;
	stateName: string;
	stateType: string;
	creator: string;
	labels: string[];
}
