# PRQ — Product Backlog

## Now

- [ ] `prq open [identifier]` — resolve a PR from the queue and open it in the browser
  - Identifier parsing: PR number (`482`), repo#number (`org/repo#482`), full URL
  - Number-only resolution: search the user's queue, find the matching PR
  - Cross-platform: macOS (`open`), Linux (`xdg-open`), Windows (`start`)
  - Foundation for all future action commands

## Next

- [ ] `prq nudge [identifier]` — post a comment on a stale PR
  - Default message: "Hey @{author}, is this PR still active?"
  - `--message` flag for custom message
  - Confirmation prompt before posting (skip with `--yes`)
- [ ] `prq review [identifier]` — open PR files changed tab for review
  - Default: opens `{url}/files` in browser
  - Configurable: users can override to run Claude Code, Codex, etc.

## Later

- [ ] **Pluggable action system** — actions as shell command templates in config
  - `"review": "claude -p '/review {url}'"` — bring your own review tool
  - `"checkout": "gh pr checkout {number} --repo {owner}/{repo}"` — custom actions
  - Template variables: `{url}`, `{number}`, `{owner}`, `{repo}`, `{title}`, `{author}`, `{days}`
  - `prq run <action> [identifier]` for custom actions
  - Default actions ship out of the box, users override in `.prqrc.json`
- [ ] **Interactive mode** — `prq` with no args or `prq -i`
  - Arrow keys to navigate PRs from status list
  - Enter to select → submenu: open, review, nudge, copy URL
  - `q` to quit
- [ ] **Claude Code integration**
  - `prq review <pr>` dispatches Claude Code session via `claude -p`
  - `prq sessions` — track which PRs are being reviewed
  - Parallel review dispatch: `prq review 482 491 503`
- [ ] **Slack/desktop notifications**
  - `prq watch` — background polling mode
  - Post to Slack channel or DM when new PRs need attention
  - Desktop notifications via native OS APIs

## Ideas

- [ ] GitHub Action to auto re-request reviewers when author pushes new commits
- [ ] `prq stats` — review turnaround time, response rates, bottleneck analysis
- [ ] Linear integration — see Linear issues assigned to you alongside PRs
- [ ] GitHub Issues integration — not just PRs, also issues you're tagged on
- [ ] Team mode — see the review queue for your whole team, not just you
- [ ] Caching — store last `prq status` result locally to speed up identifier resolution
- [ ] `prq config` — view/edit config from the CLI instead of editing JSON manually
