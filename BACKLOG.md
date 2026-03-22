# PRQ — Product Backlog

## Done

- [x] `prq status` — categorized view of PRs needing attention
- [x] `prq init` — interactive config setup
- [x] `prq open <identifier>` — open a PR in the browser
- [x] `prq review <identifier>` — open PR files changed tab (configurable)
- [x] `prq nudge <identifier>` — post a nudge comment on stale PRs
- [x] Nudge tracking — warns if a PR was already nudged, prevents duplicate nudges
- [x] In-progress tracking — mark PRs as started, persisted locally
- [x] `prq status --all` — show all open PRs in configured repos
- [x] Identifier resolution: number, repo#number, full URL
- [x] Pluggable action system — actions as shell command templates in config
- [x] Interactive mode — keyboard navigation, actions menu
- [x] Claude Code `/prq` skill
- [x] Landing page with scroll-animated terminal demo
- [x] Monorepo structure (apps/cli, apps/web)
- [x] Semantic release to npm
- [x] Brand identity (.brand file, design system, favicons)

## Now

(empty — accepting contributions)

## Next

- [ ] **Slack/desktop notifications**
  - `prq watch` — background polling mode
  - Post to Slack channel or DM when new PRs need attention
  - Desktop notifications via native OS APIs
- [ ] **Parallel review dispatch** — `prq review 482 491 503`

## Ideas

- [ ] GitHub Action to auto re-request reviewers when author pushes new commits
- [ ] `prq stats` — review turnaround time, response rates, bottleneck analysis
- [ ] Linear integration — see Linear issues assigned to you alongside PRs
- [ ] GitHub Issues integration — not just PRs, also issues you're tagged on
- [ ] Team mode — see the review queue for your whole team, not just you
- [ ] Caching — store last `prq status` result locally to speed up identifier resolution
- [ ] `prq config` — view/edit config from the CLI instead of editing JSON manually
