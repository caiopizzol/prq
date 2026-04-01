---
name: "prq"
tagline: "What needs you, right now."
version: 2
language: en
---

# prq

## Strategy

### Overview

prq is a developer CLI that tells you what needs your attention — PRs, issues, tickets — and lets you act on it without leaving the terminal. One command. Everything that needs you. Categorized by why.

It started as a PR review queue. That was the first problem: every morning, open GitHub, scroll notifications, click into PRs, cross-reference what actually needs action. That workflow is broken. prq replaced it with a single command.

But the problem is bigger than PRs. Developers today are jumping between GitHub, Linear, Slack, email — four platforms before they write a line of code. Every tool has its own notification system, its own idea of what's urgent, its own inbox. The result: scattered attention, dropped work, and the constant feeling that something is slipping through the cracks.

AI made it worse and better. More code is being generated. More PRs, more issues, more tickets. But now developers have agents — Claude Code, Codex, Copilot — that can do the work if you point them at the right thing. The missing piece isn't another agent. It's knowing what to point the agent at.

**What prq really does:** prq reads the state of everything you're involved in across systems and tells you what changed since you last looked. It understands semantics — not just "you're a reviewer," but "you reviewed this, and new commits landed after." Not just "this ticket is assigned to you," but "this ticket has been in progress for a week with no linked PR." It turns scattered signals into an actionable, categorized queue.

**The problem it solves:** Developers have no single place to answer "what should I do next?" Every tool shows its own slice. No tool shows the full picture — ordered by urgency, categorized by action needed, actionable from where the developer already is.

**The transformation:**
- Before: Open GitHub. Open Linear. Check Slack. Check email. Cross-reference. Build a mental model. Repeat daily.
- After: `prq` — and you know exactly where you stand.

**Long-term ambition:** The terminal interface for developer work — the place where you see what needs you, dispatch agents to handle it, and never leave the command line.

### Positioning

**Category:** Developer attention CLI

prq creates a new category. Not a dashboard (those display). Not a notification manager (those pipe). Not a project management tool (those track). prq is an attention engine — it understands the semantics of your work across systems and tells you what needs action, categorized by why.

**Stance:** Developer-first. Every tool in this space is either a platform that wants you to change your workflow, a dashboard that shows everything without opinion, or a notification pipe that forwards what someone else decided matters. prq is the tool that understands *your* work and tells *you* what to do next.

**What prq is NOT:**
- Not a coding agent. Not Claude Code, not Codex, not Copilot. We don't write code — we tell you (or your agent) what code to write.
- Not a project management tool. Not Linear, not Jira, not GitHub Projects. We don't track work — we surface what's stuck.
- Not a dashboard. Not a web app. Not a platform. We don't display — we triage.
- Not a notification manager. We don't show you notifications — we tell you what needs action.
- Not a workflow replacement. We don't change how you use GitHub or Linear — we make them visible from one place.

**Competitive landscape:**

The market splits into layers:

1. **Heavy platforms** (Graphite, Aviator) — require workflow adoption, team buy-in, paid plans. They replace your Git workflow. High value, high commitment.
2. **AI reviewers** (CodeRabbit, Qodo) — bots that review code for you. They automate the content of reviews, not the logistics.
3. **General dashboards** (gh-dash) — rich terminal UIs that show PRs and issues by filter. Powerful, configurable, but not opinionated about what matters. They display. They don't triage.
4. **Notification tools** (gh-notify, Gitify) — surface GitHub notifications with better filtering. They don't understand work semantics.
5. **Single-system CLIs** (linear-cli, gh) — interact with one platform from the terminal. Useful, but siloed. You still need three tools for three systems.
6. **Coding agents** (Claude Code, Codex, Copilot) — execute work. Powerful, but need direction. They answer "how" but not "what."

prq sits in the gap between knowing and doing: **an opinionated CLI that understands your work across systems, tells you what needs attention, and lets you dispatch action — to yourself, to a browser, or to an agent.**

**Structural differentials:**
- **Semantic categorization** — understands *why* something needs you, not just that it exists. "Needs re-review" (new commits after your review), "Stale" (no activity for N days), "Blocked" (waiting on someone). No other tool categorizes this way.
- **Cross-system** — GitHub PRs, GitHub issues, Linear tickets. One command, one queue, one mental model. Everything else is siloed.
- **Zero config** — works the moment your tools are authenticated. No YAML, no setup wizard, no onboarding.
- **Agent-native** — custom actions with template variables let you dispatch to Claude Code, Codex, scripts, or any tool. prq is the attention layer; agents are the execution layer.
- **Composable** — JSON output, custom actions, pipes to scripts. Terminal-native, Unix-philosophy composability.
- **Nudge as a primitive** — built-in ability to poke stale work. Turns passive monitoring into active queue management.

**Territory:** prq owns the concept of **developer attention as a first-class object** — not a filter on a dashboard, not a subset of notifications, but a unified, semantic, actionable queue across every system that generates work for a developer.

### Personality

**Dominant archetype:** The Interface — the calm layer between a developer and the chaos of their work. Like Raycast for the terminal. Like `git status` for everything. Hit `prq` and you get a clear signal about the state of your world.

**Attributes the brand transmits:**
- Direct
- Terminal-native
- Opinionated
- Lightweight
- Calm
- Unified

**What prq IS:**
- A clear signal in a noisy system
- An answer, not a dashboard
- A tool for developers who ship
- The starting point of every work session
- The interface between you and your agents

**What prq is NOT:**
- Enthusiastic
- Enterprise
- Feature-rich
- Trying to impress you
- Trying to replace your tools

### Promise

You will never lose track of what needs your attention again.

One command tells you what needs you — across PRs, issues, and tickets — categorized by why, actionable from where you already are.

**Base message:** Developers shouldn't need four platforms to know what to do next. prq is one command.

**Synthesizing phrase:** prq exists so developers can stop context-switching and start shipping.

### Guardrails

**Tone summary:** Concise. Technical. Calm. Dry. Helpful.

**What the brand cannot be:**
- A platform that tries to do everything
- Marketing-speak dressed as a developer tool
- Urgency theater ("Don't miss critical work!")
- Enterprise positioning ("Scale your workflow across organizations")
- A replacement for the tools it integrates with
- Cute or playful

**Litmus test:** If it sounds like a vendor pitch, it's wrong.

---

## Voice

### Identity

We built prq because we got tired of the same ritual every morning. Open GitHub. Scroll notifications. Open Linear. Check what's assigned. Check Slack. Check email. Twenty minutes of context-switching before you write a line of code.

We're not a platform. We're not building the future of project management. We're a command you run in your terminal that tells you what needs your attention right now — across every system that generates work for you. That's it.

We think the terminal is the developer's home. Not the browser. Not Slack. Not a dashboard. Developers are writing code, reviewing code, and dispatching agents from the command line. The tools that track their work should live there too.

We speak developer because we are developers. We don't explain what a PR is. We don't sell you on the value of code review. We don't pitch you on task management. We assume you're already drowning in notifications across four platforms — we just give you one place to see what matters.

**Essence:** One command. Everything that needs you.

### Tagline & Slogans

**Primary tagline:** What needs you, right now.
*Use on: homepage hero, social headers, npm description*

**Alternatives:**
- One command. Zero noise.
- Your work, one command away.
- The developer's home screen.

**Slogans:**
- `git status` for your entire workload.
- Stop context-switching. Start shipping.
- Four platforms. One command.
- See your queue. Act on it. Move on.
- The fastest way to know what needs you.
- You don't need another dashboard. You need an answer.
- One command between you and your agents.

### Manifesto

You check your email. Twelve GitHub notifications. Three are reviews. One is a bot. The rest are threads you were tagged in a week ago.

You open Linear. Four tickets assigned to you. One has a comment from yesterday you missed. Another has been "in progress" for a week — you forgot to update it when the PR merged.

You check Slack. Someone asked about your PR in a thread you didn't see. A deploy failed and nobody told you directly.

Four platforms. Four inboxes. Four ideas of what's urgent. And you haven't written a line of code yet.

This is broken.

Your workload should be one command away. Not scattered across tabs. Not buried in email. Not dependent on someone else's notification system deciding what matters.

The tools that try to fix this either want you to adopt an entirely new workflow, give you a prettier way to look at the same mess, or build another platform on top of the platforms you already have.

We went the other way. One command. Here's what needs you, and why. Act on it or move on.

PRs waiting on your review — because new commits landed after your feedback. Issues assigned to you — because they're open and stale. Tickets in your sprint — because they haven't moved. Your PRs waiting — because you wrote code too and it deserves attention.

That's the product. Not a platform. Not a workflow. Not a dashboard. An answer to the question every developer asks every morning: what should I do next?

And when you know, you can do it — or tell an agent to do it — without leaving the terminal.

`prq` — and you know exactly where you stand.

### Message Pillars

**Clarity**
- prq doesn't show you everything. It shows you what matters.
- Categorized by action needed, not just existence.

**Unity**
- GitHub PRs. GitHub issues. Linear tickets. One command.
- Stop opening four platforms to understand your workload.

**Speed**
- Instant answer. No login, no setup wizard, no onboarding flow.
- Works the moment your tools are authenticated.

**Dispatch**
- See it. Act on it. Send it to an agent. Move on.
- prq is the attention layer. Claude Code is the execution layer.

**Composability**
- JSON output. Custom actions. Template variables.
- Pipe it, script it, feed it to an agent.

**Honesty**
- We say what the tool does and what it doesn't.
- No roadmap promises disguised as features.

### Phrases

- "What needs you, right now."
- "`git status` for your entire workload."
- "A dashboard shows you everything. prq tells you what matters."
- "Your queue, not your notifications."
- "Four platforms. One command."
- "Run it. Read it. Get back to work."
- "We don't replace your tools. We make them legible."
- "The terminal is home. prq is the front door."
- "More code. More PRs. More tickets. Same you. That's why prq exists."
- "See it. Dispatch it. Ship it."
- "One command between you and what needs you."

### Social Bios

**GitHub:** Developer attention CLI — see what needs you across GitHub and Linear. One command.

**npm:** See what needs your attention — PRs, issues, tickets — from one command. No dashboard. No setup.

**X/Twitter:** prq — what needs you, right now. PRs. Issues. Tickets. One command. `npm i -g prq-cli`

**LinkedIn:** prq is a developer CLI that shows you what needs your attention — across GitHub PRs, issues, and Linear tickets. Categorized by why, actionable from the terminal. One command. Zero noise. Open source. prq.sh

**Website (prq.sh):** The fastest way to see what needs your attention. PRs. Issues. Tickets. One command. Zero noise.

### Tonal Rules

1. Speak in short, declarative sentences. If a sentence has a comma, consider splitting it.
2. Developer-to-developer. Never explain what a PR is, what Linear is, or why code review matters.
3. Calm authority. No exclamation marks. No urgency theater. The tool speaks for itself.
4. Concrete over abstract. Say "four platforms" not "fragmented workflow." Say "one command" not "unified interface."
5. Understated over enthusiastic. We'd rather be dry than excited.
6. Show the terminal output. A screenshot of `prq` running is worth more than any copy.
7. Lead with what it does, not what it is. "See what needs your attention" not "prq is a developer tool that..."
8. Use backticks for code and commands. `prq` is always monospace.
9. No metaphors from outside software. No "unleash," "empower," "supercharge," "revolutionize."
10. When in doubt, write less.

**Identity boundaries:**
- We are not a platform trying to replace GitHub or Linear.
- We are not a coding agent trying to replace Claude Code or Codex.
- We are not building "the future of project management."
- We are not an enterprise tool that needs a sales call.
- We are not a notification client with better filters.
- We are not a dashboard with more widgets.

**We Say / We Never Say:**

| We Say | We Never Say |
|---|---|
| "See what needs your attention" | "Supercharge your developer workflow" |
| "One command" | "Seamless integration" |
| "PRs, issues, tickets" | "Unified development pipeline" |
| "No setup needed" | "Get started in minutes" |
| "Terminal-first" | "Beautiful dashboard" |
| "Open source" | "Enterprise-grade solution" |
| "Dispatch to an agent" | "AI-powered automation" |
| "Run `prq`" | "Unlock your team's velocity" |
| "Four platforms. One command." | "Centralized developer experience" |
| "What needs you" | "Actionable insights" |

---

## Visual

### Colors

**Core palette:**
- **Background:** `#0A0A0C` (near-black) — page background, primary surface
- **Surface:** `#111115` (dark surface) — cards, terminal mockups, elevated elements
- **Border:** `#1E1E24` — dividers, card borders, horizontal rules
- **Text:** `#FAFAFA` (white) — primary text, headings
- **Muted:** `#6E6E7A` — secondary text, descriptions, captions
- **Dim:** `#3E3E47` — tertiary text, deemphasized content, problem narrative
- **Faint:** `#2A2A32` — subtle borders, row dividers, background accents

**Brand color:**
- **Accent:** `#A78BFA` (soft purple) — the dot in `prq.`, links, interactive elements, highlights
- **Accent dark:** `#7C3AED` — the dot on light backgrounds

**Semantic colors:**
- **Success:** `#4ADE80` (green) — requested reviews, install commands, positive states
- **Warning:** `#FACC15` (yellow) — needs re-review, attention states
- **Danger:** `#FB7185` (pink-red) — stale items, alert states
- **Info:** `#60A5FA` (blue) — issues, Linear tickets, informational states

**Avoid:** GitHub blue (`#58A6FF`), bright/saturated backgrounds, gradients, any color used decoratively rather than semantically.

### Typography

- **Display:** JetBrains Mono 800 — hero headlines, logo, `prq.` logotype
- **Heading:** JetBrains Mono 600 — section headings, feature titles
- **Body:** JetBrains Mono 400 — paragraphs, descriptions, long-form text
- **Code:** JetBrains Mono 400 — CLI examples, install commands, terminal output, inline code
- **Caption:** JetBrains Mono 400, uppercase, letter-spacing 0.1em — section labels, metadata
- **Scale:** 11 / 13 / 15 / 20 / 32 / 72

### Photography

- **Mood:** Dark, focused, technical, ambient
- **Subjects:** Terminal windows, code editors, dark desks with single monitors, keyboard close-ups
- **Avoid:** Stock photos of people, office environments, colorful illustrations, AI-generated imagery, anyone smiling at a laptop

### Style

**Design keywords:** Typographic. Monospace. Dark. Minimal. Precise. Terminal-native.

**Reference brands:** Raycast (started focused, became the interface layer), Linear (opinionated minimalism, confident typography), Arc (reimagined a familiar tool into a workspace), Resend (developer-first clarity, dark aesthetic).

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
- Category colors (green/yellow/red/blue) only for semantic meaning
- Version badge as pill: `border: 1px solid #1E1E24; border-radius: 100px; color: accent`
- Buttons: primary is white text on dark, ghost is muted text with hover to white

**Never:**
- Bright backgrounds
- Rounded, playful UI elements
- Emoji in branding
- Stock photography
- Gradient buttons or colorful CTAs
- Decorative illustrations
