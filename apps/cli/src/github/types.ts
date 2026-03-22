export interface PRBasic {
	number: number;
	title: string;
	author: string;
	repo: string;
	url: string;
	isDraft: boolean;
	updatedAt: string;
	requestedReviewers: string[];
}

export interface PRWithCommit extends PRBasic {
	latestCommitAt: string;
}

export interface PRWithReviews extends PRBasic {
	userLastReviewedAt: string;
	latestCommitAt: string;
	latestAuthorCommentAt: string | null;
}
