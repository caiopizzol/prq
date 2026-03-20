# prq

[![npm version](https://img.shields.io/npm/v/prq-cli.svg)](https://www.npmjs.com/package/prq-cli)

PR Queue — see what code reviews need your attention.

A CLI tool that queries GitHub and shows you a categorized view of PRs that need action. Navigate your queue, open reviews, nudge stale PRs — all from the terminal.

## Install

```bash
npm install -g prq-cli
```

Requires [GitHub CLI](https://cli.github.com/) (`gh`) to be authenticated.

## Quick Start

```bash
# See your review queue
prq

# Interactive mode
prq -i

# Act on a PR
prq review 482
prq open 482
prq nudge 482
```

## Commands

### `prq status` (default)

Shows PRs needing your attention in four categories:

```bash
prq                                        # all repos
prq status --repos org/repo1 org/repo2     # specific repos
prq status --json                          # machine-readable
prq status -i                              # interactive mode
```

### Interactive Mode (`prq -i`)

Navigate your queue with keyboard shortcuts:

- **↑↓** navigate  **r** review  **o** open  **n** nudge  **c** copy url  **q** quit

### `prq open/review/nudge <identifier>`

Act on PRs by number, `org/repo#number`, or full URL:

```bash
prq open 482                               # open in browser
prq review 482                             # open files changed
prq nudge 482                              # post a comment
prq nudge 482 --yes --message "Update?"    # skip confirmation
```

### `prq run <action> <identifier>`

Run custom actions defined in your config.

### `prq init`

Creates a `.prqrc.json` config file.

## Custom Actions

Actions are configurable shell command templates:

```json
{
  "repos": ["org/repo"],
  "actions": {
    "review": "claude -p '/review {url}'",
    "checkout": "gh pr checkout {number} --repo {owner}/{repo}"
  }
}
```

Variables: `{url}`, `{number}`, `{owner}`, `{repo}`, `{title}`, `{author}`, `{days}`

## Project Structure

```
prq/
├── apps/
│   ├── cli/     # CLI tool (published to npm as prq-cli)
│   └── web/     # Landing page
├── brand/       # Design assets
└── .brand       # Brand strategy
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
