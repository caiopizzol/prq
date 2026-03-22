const SKILL_CONTENT = `---
name: prq
description: PR review queue manager. Use when the user wants to check their PR review queue, review PRs, nudge stale PRs, open PRs, or manage code review workflow. Triggers on mentions of "review queue", "PRs waiting", "stale PRs", "what needs review", "open PR", "nudge", or "prq".
---

# PRQ CLI

\`prq\` is a CLI tool for managing code review queues. It's installed on this machine.

## Commands

\`\`\`bash
# Show the review queue (JSON for parsing)
prq status --json

# Show all open PRs in configured repos (not just yours)
prq status --all --json

# Open a PR in the browser
prq open <number>
prq open <owner/repo#number>

# Open files changed tab for review
prq review <number>

# Post a nudge comment on a stale PR
prq nudge <number> --yes
prq nudge <number> --message "Custom message" --yes

# Run any configured action
prq run <action> <number>
\`\`\`

## JSON output

\`prq status --json\` returns:

\`\`\`json
{
  "user": "caio-pizzol",
  "prs": [
    {
      "category": "needs-re-review",
      "repo": "org/repo",
      "number": 2439,
      "title": "fix: something",
      "author": "alice",
      "url": "https://github.com/org/repo/pull/2439",
      "detail": "New commits since your review 1d ago"
    }
  ]
}
\`\`\`

Categories: \`needs-re-review\`, \`requested\`, \`stale\`, \`waiting-on-others\`, \`open\` (only with \`--all\`).

## Usage

- When the user asks about their review queue, run \`prq status --json\` and present the results grouped by category.
- When the user asks to open, review, or nudge a PR, use the corresponding \`prq\` command.
- For batch operations ("nudge all stale PRs"), filter the JSON output and confirm with the user before acting.
`;

export function skillCommand(global: boolean): void {
	if (global) {
		const fs = require("node:fs");
		const path = require("node:path");
		const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
		const skillDir = path.join(home, ".claude", "skills", "prq");
		const skillPath = path.join(skillDir, "SKILL.md");

		fs.mkdirSync(skillDir, { recursive: true });
		fs.writeFileSync(skillPath, SKILL_CONTENT);
		console.log(`Installed to ${skillPath}`);
	} else {
		const fs = require("node:fs");
		const skillDir = ".claude/skills/prq";
		const skillPath = `${skillDir}/SKILL.md`;

		fs.mkdirSync(skillDir, { recursive: true });
		fs.writeFileSync(skillPath, SKILL_CONTENT);
		console.log(`Installed to ${skillPath}`);
	}
}
