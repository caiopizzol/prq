export interface PRBasic {
	number: number;
	title: string;
	author: string;
	repo: string;
	url: string;
	isDraft: boolean;
	updatedAt: string;
	requestedReviewers: string[];
	labels: string[];
}

export interface PRWithCommit extends PRBasic {
	latestCommitAt: string;
}

export interface PRWithReviews extends PRBasic {
	userLastReviewedAt: string;
	latestCommitAt: string;
	latestAuthorCommentAt: string | null;
}

export interface IssueBasic {
	number: number;
	title: string;
	author: string;
	repo: string;
	url: string;
	updatedAt: string;
	assignees: string[];
	labels: string[];
}

export interface IssueWithComments extends IssueBasic {
	userLastCommentAt: string | null;
	latestOtherCommentAt: string | null;
}
