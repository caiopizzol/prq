const months = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function formatDate(iso: string) {
	const d = new Date(iso);
	return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function esc(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string) {
	return esc(s)
		.replace(/\*\*`([^`]+)`\*\*/g, "<strong><code>$1</code></strong>")
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function parseBody(md: string) {
	let html = "";
	for (const line of md.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith("### ")) {
			const title = trimmed.slice(4).trim();
			const label = title
				.replace(/what's new/i, "New")
				.replace(/improvements?/i, "Improvements")
				.replace(/fix(es)?/i, "Fixes");
			html += `</ul><h3>${esc(label)}</h3><ul>`;
		} else if (trimmed.startsWith("- ")) {
			html += `<li>${inline(trimmed.slice(2))}</li>`;
		}
	}
	html = html.replace(/^<\/ul>/, "");
	if (html.includes("<ul>")) html += "</ul>";
	return html;
}

interface Release {
	tag_name: string;
	published_at: string;
	body: string;
}

const dir = import.meta.dir;

const res = await fetch(
	"https://api.github.com/repos/caiopizzol/prq/releases?per_page=100",
);
const releases: Release[] = await res.json();

const grouped = new Map<string, Release[]>();
for (const r of releases) {
	if (!r.body?.trim()) continue;
	const version = r.tag_name.replace(/^v/, "");
	const [major, minor] = version.split(".");
	const key = `${major}.${minor}`;
	if (!grouped.has(key)) grouped.set(key, []);
	grouped.get(key)?.push(r);
}

let sections = "";
for (const [, group] of grouped) {
	const primary = group[0];
	const version = primary.tag_name.replace(/^v/, "");

	let body = "";
	for (const r of group) {
		body += `${r.body}\n`;
	}

	const parsed = parseBody(body);
	if (!parsed) continue;

	sections += `    <section class="release">
      <div class="release-header">
        <h2 id="${primary.tag_name}">${esc(version)}</h2>
        <time>${formatDate(primary.published_at)}</time>
      </div>
      ${parsed}
    </section>\n\n`;
}

const templatePath = `${dir}/../changelog.template.html`;
const template = await Bun.file(templatePath).text();
const output = template.replace("{{RELEASES}}", sections.trimEnd());

await Bun.write(`${dir}/changelog.html`, output);
console.log(`Built changelog with ${grouped.size} releases`);
