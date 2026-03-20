---
name: "prq"
tagline: "One command. Zero noise."
version: 1
language: en
---

# prq

## Strategy

### Overview

prq is a CLI tool that tells developers exactly what code reviews need their attention — categorized by why, not just that they exist. One command, instant answer, zero setup.

Built out of personal frustration: the daily ritual of opening GitHub, hunting through notifications, copying PR URLs, cross-referencing what actually needs action. That workflow is broken. prq replaces it with a single command.

**What it really does:** prq reads the state of every PR you're involved in and tells you what changed since you last looked. It understands review semantics — not just "you're a reviewer," but "you reviewed this, and new commits landed after." It turns GitHub's raw notification stream into an actionable, categorized queue.

**The problem it solves:** Developers lose track of what needs their attention. GitHub's notification system treats a bot comment the same as an urgent review request. The "awaiting your review" filter misses PRs where authors addressed feedback but forgot to re-request review. Stale PRs sit for days. The result: slower shipping, frustrated teammates, dropped work.

**The transformation:**
- Before: Open GitHub. Scroll notifications. Click into PRs. Cross-reference. Build a mental model. Repeat daily.
- After: `prq` — and you know exactly where you stand.

**Long-term ambition:** A real-time attention layer for developers — PRs, issues, tickets — surfaced where they work, designed for agents.

### Positioning

**Category:** Review queue CLI

**What prq is NOT:**
- Not a dashboard. Not a web app. Not a platform.
- Not a notification manager. We don't show you notifications — we tell you what needs action.
- Not a workflow replacement. We don't change how you use GitHub — we make it visible.
- Not an AI code reviewer. We don't read your diffs — we read your queue.

**Competitive landscape:**

The market splits into three tiers:

1. **Heavy platforms** (Graphite, Aviator) — require workflow adoption, team buy-in, paid plans. They replace your Git workflow with stacked PRs, merge queues, AI reviewers. High value, high commitment.
2. **General dashboards** (gh-dash) — rich terminal UIs that show PRs and issues by filter. Powerful, configurable, but not opinionated about what matters. They display. They don't triage.
3. **Notification tools** (gh-notify, Octobox, Gitify) — surface raw GitHub notifications with better filtering. They don't understand PR review state — they just pipe what GitHub already sends.

prq sits in the gap: **an opinionated, zero-config CLI that understands PR review semantics and categorizes by action needed.**

**Structural differentials:**
- **Action-oriented categories** — "Needs re-review" (new commits after your review), "Requested" (awaiting first review), "Stale" (no activity), "Your PRs waiting" (author perspective). No other tool categorizes this way.
- **Zero config** — works the moment `gh` is authenticated. No YAML, no Nerd Fonts, no setup wizard.
- **Single-purpose** — does one thing. Doesn't try to replace GitHub, manage stacked PRs, or run CI.
- **Nudge as a primitive** — built-in ability to poke stale PRs. Turns passive monitoring into active queue management.
- **Composable** — JSON output, custom actions with template variables, pipes to scripts and agents.

**Territory:** prq owns the concept of **the review queue as a first-class object** — not a filter on a dashboard, not a subset of notifications, but a standalone, semantic, actionable queue.

### Personality

**Dominant archetype:** The Instrument — precise, single-purpose, does one thing perfectly. Like `git status` for reviews. Like a tuning fork: hit it and you get a clear signal.

**Attributes the brand transmits:**
- Direct
- Terminal-native
- Opinionated
- Lightweight
- Honest

**What prq IS:**
- A scalpel, not a Swiss Army knife
- An answer, not a dashboard
- A tool for developers who ship
- Calm clarity in a noisy system

**What prq is NOT:**
- Enthusiastic
- Enterprise
- Feature-rich
- Trying to impress you

### Promise

You will never miss a PR that needs your review again.

One command tells you what needs your attention, why it needs it, and lets you act on it — without leaving the terminal.

**Base message:** Code review is the bottleneck. prq removes it.

**Synthesizing phrase:** prq exists so code review stops being the thing that slows everyone down.

### Guardrails

**Tone summary:** Concise. Technical. Calm. Dry. Helpful.

**What the brand cannot be:**
- A platform that tries to do everything
- Marketing-speak dressed as a developer tool
- Urgency theater ("Don't miss critical reviews!")
- Enterprise positioning ("Scale your review process across organizations")
- Cute or playful

**Litmus test:** If it sounds like a vendor pitch, it's wrong.

---

## Voice

### Identity

We built prq because we got tired of the same ritual every morning. Open GitHub. Scroll through notifications. Click into a PR to figure out if it actually needs you. Copy the URL. Paste it somewhere useful. Repeat twelve times. Lose twenty minutes you'll never get back.

We're not a platform. We're not a dashboard. We're not building the future of code review. We're a command you run in your terminal that tells you what needs your attention right now. That's it.

We speak developer because we are developers. We don't explain what a PR is. We don't sell you on the value of code review. We assume you're already doing the work — we just make the overhead disappear.

**Essence:** One command, clear signal.

### Tagline & Slogans

**Primary tagline:** One command. Zero noise.
*Use on: homepage hero, social headers, npm description*

**Alternatives:**
- Your review queue, at a glance.
- What needs your attention, right now.

**Slogans:**
- Code review, minus the noise.
- Never miss a review again.
- `git status` for code reviews.
- The fastest way to know what needs you.
- See your queue. Act on it. Move on.

### Manifesto

You check your email. Twelve GitHub notifications. Three are reviews. One is a bot. The rest are threads you were tagged in a week ago.

You open the PR tab. Filter by "awaiting your review." Two results. But you know there are more — Alice pushed fixes to that PR you reviewed on Monday. She just forgot to re-request.

So you scroll. You click. You cross-reference. You build a mental model of what actually needs you.

This is broken.

Your review queue should be one command away. Not buried in a web UI. Not drowned in email. Not dependent on someone else remembering to click a button.

The tools that try to fix this either want you to adopt an entirely new workflow or give you a prettier way to look at the same mess. More dashboards. More filters. More configuration.

We went the other way. One command. Four categories. Here's what needs you, and why.

Needs re-review — because new commits landed after your feedback. Requested — because someone asked and you haven't looked yet. Stale — because nothing moved and someone should care. Your PRs waiting — because you wrote code too and it deserves attention.

That's the whole product. Not a platform. Not a workflow. A clear answer to a simple question.

`prq` — and you know exactly where you stand.

### Message Pillars

**Clarity**
- prq doesn't show you everything. It shows you what matters.
- Four categories. One command. No noise.

**Speed**
- Instant answer. No login, no setup wizard, no onboarding flow.
- Works the moment `gh` is authenticated.

**Precision**
- Categorized by action needed, not just existence.
- Knows the difference between "requested" and "needs re-review."

**Composability**
- JSON output. Custom actions. Template variables.
- Pipe it, script it, feed it to an agent.

**Honesty**
- We say what the tool does and what it doesn't.
- No roadmap promises disguised as features.

### Phrases

- "One command. Zero noise."
- "`git status` for code reviews."
- "A dashboard shows you everything. prq tells you what matters."
- "Your queue, not your notifications."
- "We don't replace GitHub. We make it legible."
- "Run it. Read it. Get back to work."
- "Four categories. That's the whole product."

### Social Bios

**GitHub:** PR Queue — CLI to see what code reviews need your attention.

**npm:** See what code reviews need your attention. One command. No dashboard. No setup.

**X/Twitter:** prq — your review queue, one command away. `npm i -g prq-cli`

**LinkedIn:** prq is a CLI tool that tells developers exactly what code reviews need their attention. Four categories — needs re-review, requested, stale, your PRs waiting — one command, zero setup. Open source. prq.sh

**Website (prq.sh):** The fastest way to see what code reviews need your attention. One command. Four categories. Zero noise.

### Tonal Rules

1. Speak in short, declarative sentences. If a sentence has a comma, consider splitting it.
2. Developer-to-developer. Never explain what a PR is or why code review matters.
3. Calm authority. No exclamation marks. No urgency theater. The tool speaks for itself.
4. Concrete over abstract. Say "four categories" not "intelligent categorization." Say "one command" not "streamlined workflow."
5. Understated over enthusiastic. We'd rather be dry than excited.
6. Show the terminal output. A screenshot of `prq` running is worth more than any copy.
7. Lead with what it does, not what it is. "See what needs your attention" not "prq is a developer tool that..."
8. Use backticks for code and commands. `prq` is always monospace.
9. No metaphors from outside software. No "unleash," "empower," "supercharge," "revolutionize."
10. When in doubt, write less.

**Identity boundaries:**
- We are not a platform trying to replace GitHub.
- We are not consultants who leave a dashboard behind.
- We are not building "the future of code review."
- We are not an enterprise tool that needs a sales call.
- We are not a notification client with better filters.

**We Say / We Never Say:**

| We Say | We Never Say |
|---|---|
| "See what needs your attention" | "Supercharge your review workflow" |
| "One command" | "Seamless integration" |
| "PRs waiting on you" | "Streamline your development pipeline" |
| "No setup needed" | "Get started in minutes" |
| "Terminal-first" | "Beautiful dashboard" |
| "Open source" | "Enterprise-grade solution" |
| "Four categories" | "Intelligent categorization engine" |
| "Run `prq`" | "Unlock your team's velocity" |

---

## Visual

### Colors

**Core palette:**
- **Background:** `#0A0A0C` (near-black) — page background, primary surface
- **Surface:** `#111115` (dark surface) — cards, terminal mockups, elevated elements
- **Border:** `#1E1E24` — dividers, card borders, horizontal rules
- **Text:** `#FAFAFA` (white) — primary text, headings
- **Muted:** `#6E6E7A` — secondary text, descriptions, captions

**Brand color:**
- **Accent:** `#A78BFA` (soft purple) — the dot in `prq.`, links, interactive elements, highlights
- **Accent dark:** `#7C3AED` — the dot on light backgrounds

**Semantic colors:**
- **Success:** `#4ADE80` (green) — requested reviews, install commands, positive states
- **Warning:** `#FACC15` (yellow) — needs re-review, attention states
- **Danger:** `#FB7185` (pink-red) — stale PRs, alert states

**Avoid:** GitHub blue (`#58A6FF`), bright/saturated backgrounds, gradients, any color used decoratively rather than semantically.

### Typography

- **Display:** JetBrains Mono 800 — hero headlines, logo, `prq.` logotype
- **Heading:** JetBrains Mono 600 — section headings, feature titles
- **Body:** Inter 400/500 — paragraphs, descriptions, long-form text
- **Code:** JetBrains Mono 400 — CLI examples, install commands, terminal output, inline code
- **Caption:** JetBrains Mono 400, uppercase, letter-spacing 0.1em — section labels, metadata
- **Scale:** 11 / 13 / 15 / 20 / 32 / 72

### Photography

- **Mood:** Dark, focused, technical, ambient
- **Subjects:** Terminal windows, code editors, dark desks with single monitors, keyboard close-ups
- **Avoid:** Stock photos of people, office environments, colorful illustrations, AI-generated imagery, anyone smiling at a laptop

### Style

**Design keywords:** Typographic. Monospace. Dark. Minimal. Precise. Terminal-native.

**Reference brands:** Resend (developer-first clarity, dark aesthetic), Linear (opinionated minimalism, confident typography).

**Logo:**
- **Logotype:** `prq.` in JetBrains Mono 800, lowercase
- **The dot** is the brand mark — always rendered in accent purple (`#A78BFA`)
- **Favicon:** `p.` with purple dot, on dark surface background
- No icon. No mascot. No abstract shapes. The name is the logo.

**Direction:** The identity communicates precision, not decoration. Every element earns its place. Monospace is the hero typeface — it signals that this is a tool made by developers for developers. Color is semantic, never decorative. The terminal window is the primary visual asset. If a design element doesn't make the tool clearer, remove it.

**Layout principles:**
- Centered, typographic layout with generous whitespace
- Sections separated by thin horizontal rules (`1px solid #1E1E24`)
- Purple accent used sparingly — the dot, links, active states
- Category colors (green/yellow/red) only for semantic meaning
- Version badge as pill: `border: 1px solid #1E1E24; border-radius: 100px; color: accent`
- Buttons: primary is white text on dark, ghost is muted text with hover to white

**Never:**
- Bright backgrounds
- Rounded, playful UI elements
- Emoji in branding
- Stock photography
- Gradient buttons or colorful CTAs
- Decorative illustrations
