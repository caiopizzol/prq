const SKILL_CONTENT = `---
name: prq
description: PR review queue manager. Use when the user wants to check their PR review queue, review PRs, nudge stale PRs, or manage code review workflow. Triggers on mentions of "review queue", "PRs waiting", "stale PRs", "what needs review", or "prq".
---

# PRQ — PR Review Queue

You have access to the \`prq\` CLI tool installed on this machine. Use it to help the user manage their code review queue.

## Step 1: Get the queue

Run this command to get the user's current review queue:

\`\`\`bash
prq status --json
\`\`\`

This returns a JSON object with categorized PRs:
- **needs-re-review** — PRs where the user left a review but new commits were pushed after
- **requested** — PRs where the user is a requested reviewer
- **stale** — PRs with no activity for N days
- **waiting-on-others** — PRs the user authored that are waiting on someone else

## Step 2: Present the queue

Show the results in a clear, scannable format grouped by category. For each PR, show:
- The category symbol (◆ needs re-review, ● requested, ○ stale, ◇ waiting)
- The repo and PR number
- The title
- The detail (e.g., "new commits since your review 2d ago")

Then ask what the user wants to do.

## Step 3: Act on PRs

When the user asks to act on a PR, check the \`.prqrc.json\` file in the current directory (or \`~/.config/prq/config.json\`) for custom actions:

\`\`\`json
{
  "actions": {
    "review": "/review {url}",
    "nudge": "shell:prq nudge {number} --yes"
  }
}
\`\`\`

### Action resolution

For each action template:
- **Starts with \`/\`** — it's a Claude Code skill. Invoke it by running the skill with the interpolated value. For example, \`/review https://github.com/org/repo/pull/123\`
- **Starts with \`shell:\`** — it's a shell command. Run it with the Bash tool. For example, \`prq nudge 123 --yes\`
- **Otherwise** — treat it as a prompt. Send it as a message.

### Template variables

Replace these in the action template:
- \`{url}\` — full PR URL
- \`{number}\` — PR number
- \`{owner}\` — repo owner
- \`{repo}\` — repo name
- \`{title}\` — PR title
- \`{author}\` — PR author

### Default actions (if no config found)

If no actions are configured, use these defaults:
- **review** — invoke \`/review {url}\` if the /review skill exists, otherwise run \`prq review {number}\` to open files changed in browser
- **nudge** — run \`prq nudge {number} --yes\`
- **open** — run \`prq open {number}\`

## Step 4: Batch operations

If the user says things like "review all needs-re-review PRs" or "nudge all stale PRs":

1. Filter the queue JSON by the requested category
2. Confirm the list with the user: "I'll review these 3 PRs: #2439, #2380, #2352. Proceed?"
3. Execute the action on each PR sequentially

## Examples

**User:** "check my review queue"
→ Run \`prq status --json\`, present results, ask what to do

**User:** "review 2439"
→ Look up action for "review", interpolate with PR data, execute

**User:** "nudge all stale PRs"
→ Filter stale PRs from queue, confirm, run nudge on each

**User:** "what PRs are waiting on me?"
→ Run \`prq status --json\`, show only needs-re-review and requested categories

**User:** "/prq" with no context
→ Run \`prq status --json\`, present full queue, ask what to do
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
