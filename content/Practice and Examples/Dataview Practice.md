```dataviewjs
// ===== DataviewJS: Find mentions + show file + heading =====
// Usage: change SEARCH to whatever you want.
// Supports plain text phrase search (case-insensitive by default).

const SEARCH = "mystery";      // <-- change me (can be multi-word phrase)
const CASE_SENSITIVE = false;         // true/false
const WHOLE_WORD = false;             // true => matches whole words only
const CONTEXT_CHARS = 60;             // snippet around match
const INCLUDE_CODEBLOCKS = false;     // true/false

// Optional: limit scope (folder prefix). Example: "Notes/" or "" for all
const FOLDER_PREFIX = "";             // "" means entire vault

// ---------- helpers ----------
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildNeedleRegex() {
  const raw = escapeRegex(SEARCH);
  const body = WHOLE_WORD ? `\\b${raw}\\b` : raw;
  const flags = CASE_SENSITIVE ? "g" : "gi";
  return new RegExp(body, flags);
}

function stripCodeBlocks(text) {
  // Removes fenced code blocks ```...```
  return text.replace(/```[\s\S]*?```/g, "");
}

function parseHeadingsWithLineNumbers(text) {
  // Produces [{level, title, line}]
  const lines = text.split("\n");
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)\s*$/);
    if (m) headings.push({ level: m[1].length, title: m[2].trim(), line: i });
  }
  return { lines, headings };
}

function closestHeadingForLine(headings, lineIndex) {
  // Most recent heading above this line
  let best = null;
  for (const h of headings) {
    if (h.line <= lineIndex) best = h;
    else break;
  }
  return best;
}

function makeLineLink(filePath, lineZeroBased) {
  // Obsidian supports "file#^" block links, but we don't have block ids.
  // However, reading view supports opening at a line via "obsidian://open" if you prefer.
  // This creates a normal file link and appends a "line" query in the URL form.
  const encodedPath = encodeURIComponent(filePath);
  const line = lineZeroBased + 1;
  const url = `obsidian://open?path=${encodedPath}&line=${line}`;
  return url;
}

// ---------- main ----------
if (!SEARCH || !SEARCH.trim()) {
  dv.paragraph("Set SEARCH at the top of the script.");
  return;
}

const needle = buildNeedleRegex();

let pages = dv.pages('"'+ (FOLDER_PREFIX || "") +'"')
  .where(p => p.file && p.file.path && p.file.path.endsWith(".md"));

const results = [];

for (const p of pages) {
  const path = p.file.path;

  // If you want strict folder filtering using a prefix:
  if (FOLDER_PREFIX && !path.startsWith(FOLDER_PREFIX)) continue;

  let text = await dv.app.vault.adapter.read(path);
  if (!INCLUDE_CODEBLOCKS) text = stripCodeBlocks(text);

  const { lines, headings } = parseHeadingsWithLineNumbers(text);

  // Scan line-by-line so we can compute heading for each hit
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    needle.lastIndex = 0;
    let m;
    while ((m = needle.exec(line)) !== null) {
      const start = Math.max(0, m.index - CONTEXT_CHARS);
      const end = Math.min(line.length, m.index + m[0].length + CONTEXT_CHARS);
      const snippet =
        (start > 0 ? "…" : "") +
        line.slice(start, end) +
        (end < line.length ? "…" : "");

      const heading = closestHeadingForLine(headings, i);

      results.push({
        file: p.file.link,
        filePath: path,
        heading: heading ? heading.title : "(no heading above)",
        headingLevel: heading ? heading.level : null,
        line: i + 1,
        snippet,
        jump: makeLineLink(path, i),
      });
    }
  }
}

// Sort by file then line
results.sort((a, b) => {
  if (a.filePath === b.filePath) return a.line - b.line;
  return a.filePath.localeCompare(b.filePath);
});

// ---------- render ----------
dv.paragraph(
  `Found **${results.length}** match(es) for **${SEARCH}**` +
  (FOLDER_PREFIX ? ` in **${FOLDER_PREFIX}**` : "") + "."
);

dv.table(
  ["File", "Heading", "Line", "Context", "Jump"],
  results.map(r => [
    r.file,
    r.heading,
    r.line,
    r.snippet,
    dv.el("a", "open", { href: r.jump })
  ])
);

```
