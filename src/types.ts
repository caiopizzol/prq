export type PRCategory =
  | "needs-re-review"
  | "requested"
  | "stale"
  | "waiting-on-others";

export interface CategorizedPR {
  category: PRCategory;
  repo: string;
  number: number;
  title: string;
  author: string;
  url: string;
  isDraft: boolean;
  updatedAt: string;
  detail: string;
}

export interface StatusResult {
  user: string;
  timestamp: string;
  prs: CategorizedPR[];
}
