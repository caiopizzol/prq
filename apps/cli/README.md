# prq

[![npm version](https://img.shields.io/npm/v/prq-cli.svg)](https://www.npmjs.com/package/prq-cli)

PR Queue — see what code reviews need your attention.

Four categories. What needs re-review, what's requested, what's stale, what's waiting on others. Mark PRs as in progress. Nudge stale PRs without double-pinging. `prq` is the queue. You bring the workflow.

## Install

```bash
npm install -g prq-cli
```

Requires [GitHub CLI](https://cli.github.com/) (`gh`) to be authenticated.

Optional: set `LINEAR_API_KEY` to also pull issues assigned to you in Linear (generate one at [linear.app/settings/api](https://linear.app/settings/api)).

## Quick Start

```bash
# See your review queue (interactive by default)
prq

# Non-interactive / plain text
prq --no-interactive

# Act on a PR
prq review 482
prq open 482
prq nudge 482
```

## Commands

### `prq status` (default)

Shows PRs needing your attention in four categories:

- **◆ Needs Re-review** — new commits pushed after your review
- **● Requested** — you're a requested reviewer
- **○ Stale** — no activity for N days
- **◇ Your PRs Waiting** — waiting on someone else

PRs you mark as started appear in a separate **▸ In Progress** group at the top.

```bash
prq                                        # interactive mode (default)
prq status --repos org/repo1 org/repo2     # specific repos
prq status --stale-days 7                  # custom threshold
prq status --filter type:pr                # only PRs
prq status --filter label:priority         # only items with label
prq status --filter '!draft:true'          # exclude drafts
prq status --json                          # machine-readable
prq --no-interactive                       # plain text output
```

### Interactive Mode (default)

Interactive mode is the default when running in a terminal. Navigate your queue with keyboard shortcuts:

| Key | Action |
|-----|--------|
| ↑↓ | Navigate between PRs |
| ←→ | Page up / page down |
| o | Open — open PR in browser |
| n | Nudge — post a comment (won't double-ping) |
| s | Start/Stop — mark as in progress |
| c | Copy URL to clipboard |
| f | Filter — filter by label, author, type, category, repo |
| a | Actions — open menu with all actions |
| / | Search by number, title, or author |
| q | Quit |

Press **f** to open the filter menu. Pick a dimension (label, author, type, etc.), then toggle values. Active filters show a `*` indicator in the footer. Press **0** to clear filters, or **r** to reset to your config defaults.

Press **a** to open the actions menu, which lists all actions (built-in and custom from your config). Press **1-9** to run an action, or **q** to dismiss.

### `prq open/review/nudge <identifier>`

Act on PRs by number, `org/repo#number`, or full URL:

```bash
prq open 482                               # open in browser
prq review 482                             # open files changed
prq nudge 482                              # post a comment (warns if already nudged)
prq nudge 482 --yes --message "Update?"    # skip confirmation
```

### `prq run <action> <identifier>`

Run any custom action you've defined:

```bash
prq run checkout 482
prq run ai-review 482
```

### `prq skill`

Install the `/prq` skill for Claude Code:

```bash
prq skill            # install in current project
prq skill --global   # install globally
```

## Filtering

Filter your queue from the CLI or set defaults in config. The syntax mirrors GitHub's search qualifiers.

```bash
# Include by label
prq status --filter label:priority

# Exclude (prefix with !)
prq status --filter '!label:wontfix'

# OR within a filter (comma-separated)
prq status --filter label:priority,urgent

# AND across filters (repeat --filter)
prq status --filter type:pr --filter author:alice

# Combine freely
prq status --filter type:pr --filter '!draft:true' --filter label:priority
```

### Filter keys

| Key | Matches | Example |
|-----|---------|---------|
| `label` | GitHub labels | `label:bug` |
| `author` | PR/issue author | `author:alice` |
| `type` | `pr` or `issue` | `type:pr` |
| `category` | prq category | `category:stale` |
| `repo` | Repository (or Linear team key) | `repo:org/my-repo`, `repo:ENG` |
| `draft` | Draft status | `draft:true` |
| `source` | `github` or `linear` | `source:linear`, `!source:linear` |

### Default filters

Set default filters in your config so you don't repeat them every time:

```json
{
  "filters": ["!draft:true", "!label:wontfix"]
}
```

CLI `--filter` flags override config defaults entirely (not merge). The interactive TUI starts with config filters active — clear them with **f** → **0**, or reset with **f** → **r**.

If your config filters would hide everything (e.g. `label:future` but no items currently carry that label), prq drops the rightmost clauses until results appear and tells you which ones it dropped.

## Linear

Set `LINEAR_API_KEY` and `prq` will fetch issues assigned to you and interleave them with your GitHub queue. No config needed.

- **What's pulled:** every Linear issue assigned to you, excluding states with type `completed` or `canceled`.
- **How it's categorized:** issues in a `started` state land in **In Progress**; everything else goes into **Requested**. Custom Linear statuses still work — we map by the underlying state type (`triage`, `unstarted`, `started`, etc.), not the custom name.
- **How it's displayed:** Linear items render with a `Linear` badge and team-prefixed identifier (e.g., `ENG-123`), interleaved with GitHub items in the same buckets.
- **Filter to just Linear:** `prq --filter source:linear`. Or hide it entirely: `prq --filter '!source:linear'`.

## Custom Actions

`prq` doesn't force a workflow. Every action is a configurable shell command template — inline commands or scripts. Override the defaults or add your own in `.prqrc.json`.

Actions run with full terminal control. When you trigger an action, prq suspends its TUI, the command takes over the screen (interactive tools like Claude Code work as normal), and prq resumes when the command exits.

### Use Claude Code for reviews

```json
{
  "actions": {
    "review": "claude '/review {url}'"
  }
}
```

Now `prq review 482` opens an interactive Claude Code session.

### Use Codex for reviews

```json
{
  "actions": {
    "review": "codex exec --full-auto 'review the PR at {url}'"
  }
}
```

### Use a script for complex workflows

```json
{
  "actions": {
    "review": "./scripts/review.sh {number} {url}"
  }
}
```

The script handles its own logic — session management, resuming, branching, whatever you need.

### Use gh CLI to checkout

```json
{
  "actions": {
    "checkout": "gh pr checkout {number} --repo {owner}/{repo}"
  }
}
```

Then `prq run checkout 482`.

### Just open in browser (default)

With no config, `prq review` opens the files changed tab and `prq open` opens the PR page. Zero setup needed.

### Template variables

| Variable | Example |
|----------|---------|
| `{url}` | `https://github.com/org/repo/pull/482` |
| `{number}` | `482` |
| `{owner}` | `org` |
| `{repo}` | `repo` |
| `{fullRepo}` | `org/repo` |
| `{title}` | `fix: handle edge case` |
| `{author}` | `alice` |
| `{days}` | `5` |
| `{category}` | `needs-re-review` |
| `{target}` | `@bob, @charlie` (reviewers for your PRs, author otherwise) |

## Scripting

`prq` is fully scriptable with `--json` output and `--yes` flags:

```bash
# Agent reads the queue
prq status --json

# Agent nudges all stale PRs
prq status --json | jq -r '.prs[] | select(.category == "stale") | .number' \
  | xargs -I{} prq nudge {} --yes

# Claude Code cron
prq status --json | claude -p "Review needs-re-review PRs older than 7 days"
```

### Claude Code Skill

Install the `/prq` skill to use `prq` inside Claude Code sessions:

```bash
prq skill --global
```

Then in Claude Code:

```
/prq                    → show queue, ask what to do
"review 2439"           → dispatches to your configured review action
"nudge all stale PRs"   → batch nudge
```

The skill reads your `.prqrc.json` actions — if you have `/review` configured, it uses that. If not, it falls back to opening the browser.

## Configuration

Config is loaded in this order (later overrides earlier):

1. `~/.config/prq/config.json` — global defaults
2. `.prqrc.json` — per-project config
3. CLI flags

Full example:

```json
{
  "repos": ["org/repo1", "org/repo2"],
  "staleDays": 5,
  "filters": ["!draft:true", "!label:wontfix"],
  "actions": {
    "review": "claude '/review {url}'",
    "checkout": "gh pr checkout {number} --repo {owner}/{repo}",
    "approve": "gh pr review {number} --repo {owner}/{repo} --approve"
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `repos` | `string[]` | `[]` | Repos to watch (`owner/repo`). Empty = all. |
| `staleDays` | `number` | `3` | Days of inactivity to mark as stale |
| `showAllOpen` | `boolean` | `false` | Include all open PRs in results |
| `user` | `string` | (auto) | GitHub username (defaults to authenticated user) |
| `filters` | `string[]` | `[]` | Default filters (same syntax as `--filter`) |
| `actions` | `object` | `{}` | Custom action templates |

## Project Structure

```
prq/
├── apps/
│   ├── cli/     # CLI tool (published to npm as prq-cli)
│   └── web/     # Landing page
└── brand.md     # Brand strategy
```

## Development

```bash
bun install              # install all workspace deps
bun run dev:cli          # run the CLI
bun run dev:web          # run the landing page on :3005
bun test                 # run tests
bun run lint             # lint + formatting
bun run typecheck        # type check all apps
```

## License

MIT
