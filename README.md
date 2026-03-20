# prq

[![npm version](https://img.shields.io/npm/v/prq.svg)](https://www.npmjs.com/package/prq)

PR Queue — see what code reviews need your attention.

A CLI tool that queries GitHub and shows you a categorized view of PRs that need action. No more missing review requests because someone forgot to re-request, no more stale PRs sitting idle.

## Install

```bash
bun install -g prq
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

## Development

```bash
bun install
bun run dev              # run the CLI
bun test                 # run tests
bun run lint             # check lint + formatting
bun run typecheck        # type check
```

## License

MIT
