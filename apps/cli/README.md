# prq

[![npm version](https://img.shields.io/npm/v/prq-cli.svg)](https://www.npmjs.com/package/prq-cli)

PR Queue — see what code reviews need your attention.

A CLI tool that shows you a categorized view of PRs that need action — then lets you act on them with whatever tools you already use. PRQ is the queue. You bring the workflow.

## Install

```bash
npm install -g prq-cli
```

Requires [GitHub CLI](https://cli.github.com/) (`gh`) to be authenticated.

## Quick Start

```bash
# See your review queue
prq

# Interactive mode — arrow keys + shortcuts
prq -i

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

```bash
prq                                        # all repos
prq status --repos org/repo1 org/repo2     # specific repos
prq status --stale-days 7                  # custom threshold
prq status --json                          # machine-readable
prq status -i                              # interactive mode
```

### Interactive Mode (`prq -i`)

Navigate your queue with keyboard shortcuts:

| Key | Action |
|-----|--------|
| ↑↓ | Navigate between PRs |
| r | Review — open files changed |
| o | Open — open PR in browser |
| n | Nudge — post a comment |
| c | Copy URL to clipboard |
| q | Quit |

### `prq open/review/nudge <identifier>`

Act on PRs by number, `org/repo#number`, or full URL:

```bash
prq open 482                               # open in browser
prq review 482                             # open files changed
prq nudge 482                              # post a comment
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

## Pluggable Actions

PRQ doesn't force a workflow. Every action is a configurable shell command template. Override the defaults or add your own in `.prqrc.json`:

### Use Claude Code for reviews

```json
{
  "actions": {
    "review": "claude -p '/review {url}'"
  }
}
```

Now `prq review 482` dispatches to Claude Code.

### Use Codex for reviews

```json
{
  "actions": {
    "review": "codex exec --full-auto 'review the PR at {url}'"
  }
}
```

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
| `{title}` | `fix: handle edge case` |
| `{author}` | `alice` |
| `{days}` | `5` |

## Agent & Automation

PRQ is fully scriptable with `--json` output and `--yes` flags:

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

Install the `/prq` skill to use PRQ inside Claude Code sessions:

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
    "review": "claude -p '/review {url}'",
    "checkout": "gh pr checkout {number} --repo {owner}/{repo}",
    "approve": "gh pr review {number} --repo {owner}/{repo} --approve"
  }
}
```

## License

MIT
