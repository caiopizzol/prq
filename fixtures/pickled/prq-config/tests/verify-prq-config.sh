#!/usr/bin/env bash
set -euo pipefail

test -f README.md
test -f .prqrc.json
test -f scripts/prq-review.sh
test -x scripts/prq-review.sh

if grep -R "npm install -g prq\\|bun add -g prq" .prqrc.json scripts >/dev/null; then
  echo "uses the wrong prq package name" >&2
  exit 1
fi

bun -e '
const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync(".prqrc.json", "utf8"));

if (!Array.isArray(cfg.repos)) throw new Error("repos must be an array");
for (const repo of ["caiopizzol/prq", "caiopizzol/moor"]) {
  if (!cfg.repos.includes(repo)) throw new Error(`missing repo ${repo}`);
}
if (cfg.staleDays !== 5) throw new Error("staleDays must be 5");
if (!Array.isArray(cfg.filters)) throw new Error("filters must be an array");
for (const filter of ["!draft:true", "!label:wontfix"]) {
  if (!cfg.filters.includes(filter)) throw new Error(`missing filter ${filter}`);
}
if (!cfg.actions || typeof cfg.actions !== "object") throw new Error("actions missing");
if (cfg.actions.review !== "./scripts/prq-review.sh {url}") {
  throw new Error("review action must call the helper with {url}");
}
if (cfg.actions.checkout !== "gh pr checkout {number} --repo {owner}/{repo}") {
  throw new Error("checkout action must use gh pr checkout with template variables");
}
'

grep -Fq "claude" scripts/prq-review.sh
grep -Fq "/review" scripts/prq-review.sh
grep -Fq '"$1"' scripts/prq-review.sh
