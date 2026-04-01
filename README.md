# prq

[![npm version](https://img.shields.io/npm/v/prq-cli.svg)](https://www.npmjs.com/package/prq-cli)

What needs you, right now.

`prq` shows you what needs your attention — PRs, issues, tickets — categorized by why, not just that they exist. One command. Zero noise.

Starting with code reviews: what needs re-review, what's requested, what's stale, what's waiting on others. Mark PRs as in progress. Nudge stale PRs without double-pinging. Run `prq`, see your queue, act on it, move on. Issues and tickets are next.

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

Shows PRs needing your attention in four categories. Interactive mode is the default when running in a terminal.

```bash
prq                                        # interactive mode (default)
prq status --repos org/repo1 org/repo2     # specific repos
prq status --json                          # machine-readable
prq --no-interactive                       # plain text output
```

### Interactive Mode (default)

Navigate your queue with keyboard shortcuts:

- **↑↓** navigate  **←→** page up/down  **/** search  **r** review  **o** open  **n** nudge  **s** start/stop  **c** copy url  **a** actions  **q** quit

Press **/** to search — type a PR number, title, or author and the cursor jumps to the first match. **Enter** confirms, **Esc** cancels.

Press **a** to open the actions menu — all actions (built-in and custom) are listed and accessible by number.

### `prq open/review/nudge <identifier>`

Act on PRs by number, `org/repo#number`, or full URL:

```bash
prq open 482                               # open in browser
prq review 482                             # open files changed
prq nudge 482                              # post a comment (warns if already nudged)
prq nudge 482 --yes --message "Update?"    # skip confirmation
```

### `prq run <action> <identifier>`

Run custom actions defined in your config.

### `prq init`

Creates a `.prqrc.json` config file.

## Custom Actions

Actions are configurable shell command templates. Inline commands or scripts — everything is a string:

```json
{
  "repos": ["org/repo"],
  "actions": {
    "review": "claude '/review {url}'",
    "checkout": "gh pr checkout {number} --repo {owner}/{repo}",
    "deep-review": "./scripts/review.sh {number} {url}"
  }
}
```

Actions run with full terminal control — interactive tools like Claude Code take over the screen, and prq resumes when they exit.

Variables: `{url}`, `{number}`, `{owner}`, `{repo}`, `{fullRepo}`, `{title}`, `{author}`, `{days}`, `{category}`, `{target}`

## Claude Code Skill

Install the `/prq` skill so Claude Code can use prq commands inside any session:

```bash
prq skill --global     # install globally
prq skill              # install in current project only
```

Then Claude can check your queue, open PRs, nudge, and run actions on your behalf.

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
