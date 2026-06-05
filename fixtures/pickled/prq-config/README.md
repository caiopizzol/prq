Create a project-level prq configuration.

The workspace should end with:

- `.prqrc.json`
- `scripts/prq-review.sh`

The config should:

- watch `caiopizzol/prq` and `caiopizzol/moor`
- set `staleDays` to `5`
- set filters to `!draft:true` and `!label:wontfix`
- define `review` as `./scripts/prq-review.sh {url}`
- define `checkout` as `gh pr checkout {number} --repo {owner}/{repo}`

The script should accept a PR URL as its first argument and run Claude Code
with `/review <url>`.
