# prq

[![npm version](https://img.shields.io/npm/v/prq-cli.svg)](https://www.npmjs.com/package/prq-cli)

PR Queue — see what code reviews need your attention.

Four categories. What needs re-review, what's requested, what's stale, what's waiting on others. Mark PRs as in progress. Nudge stale PRs without double-pinging. `prq` is the queue. You bring the workflow.

## Install

```bash
npm install -g prq-cli
```

Requires [GitHub CLI](https://cli.github.com/) (`gh`) to be authenticated.

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
prq status --json                          # machine-readable
prq --no-interactive                       # plain text output
```

### Interactive Mode (default)

Interactive mode is the default when running in a terminal. Navigate your queue with keyboard shortcuts:

| Key | Action |
|-----|--------|
| ↑↓ | Navigate between PRs |
| r | Review — open files changed |
| o | Open — open PR in browser |
| n | Nudge — post a comment |
| s | Start/Stop — mark as in progress |
| c | Copy URL to clipboard |
| a | Actions — open menu with all actions |
| q | Quit |

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
  "actions": {
    "review": "claude '/review {url}'",
    "checkout": "gh pr checkout {number} --repo {owner}/{repo}",
    "approve": "gh pr review {number} --repo {owner}/{repo} --approve"
  }
}
```

## License

MIT
