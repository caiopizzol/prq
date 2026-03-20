# prq

[![npm version](https://img.shields.io/npm/v/prq-cli.svg)](https://www.npmjs.com/package/prq-cli)

PR Queue — see what code reviews need your attention.

A CLI tool that queries GitHub and shows you a categorized view of PRs that need action. No more missing review requests because someone forgot to re-request, no more stale PRs sitting idle.

## Install

```bash
npm install -g prq-cli
```

Requires [GitHub CLI](https://cli.github.com/) (`gh`) to be authenticated.

## Quick Start

```bash
# Set up config for the current project
prq init

# See your review queue
prq
```

## Commands

### `prq status` (default)

Shows PRs needing your attention, grouped into four categories:

- **Needs Re-review** — you left a review, but new commits were pushed after
- **Requested Reviews** — you're a requested reviewer and haven't reviewed yet
- **Stale** — PRs you're involved in with no activity for N days
- **Your PRs Waiting** — PRs you authored that are waiting on someone else

```bash
prq                                        # all repos you have access to
prq status --repos org/repo1 org/repo2     # specific repos
prq status --stale-days 7                  # custom stale threshold
prq status --json                          # machine-readable output
```

### `prq open <identifier>`

Open a PR in the browser. Accepts a PR number, `org/repo#number`, or a full GitHub URL.

```bash
prq open 482                               # searches your queue for PR #482
prq open superdoc-dev/superdoc#482         # opens directly
prq open https://github.com/org/repo/pull/482
```

### `prq review <identifier>`

Open a PR's "Files changed" tab for review.

```bash
prq review 482
prq review superdoc-dev/superdoc#482
```

### `prq nudge <identifier>`

Post a comment on a PR asking if it's still active.

```bash
prq nudge 482                              # confirm before posting
prq nudge 482 --yes                        # skip confirmation
prq nudge 482 --message "Any updates?"     # custom message
```

### `prq init`

Creates a `.prqrc.json` config file in the current directory.

```bash
prq init
```

## Configuration

Config is loaded in this order (later overrides earlier):

1. `~/.config/prq/config.json` — global defaults
2. `.prqrc.json` — per-project config
3. CLI flags

Example `.prqrc.json`:

```json
{
  "repos": ["org/repo1", "org/repo2"],
  "staleDays": 5
}
```

## Project Structure

```
prq/
├── apps/
│   ├── cli/     # CLI tool (published to npm as prq-cli)
│   └── web/     # Landing page (prq.sh)
├── brand/       # Design assets and mockups
└── .brand       # Brand strategy file
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
