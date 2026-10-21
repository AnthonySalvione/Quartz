# Footnote Search

Search words, several keywords, or a phrase in quotation marks. Select a book to narrow the results. Click a reference to open the exact footnote; expand a result to read its full text here.

```dataviewjs
// SETTINGS: leave bibleRoot empty to find .fn.md files anywhere in the vault.
const CONFIG = { bibleRoot: "", pageSize: 50, previewLength: 360 };

const BOOKS = "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation".split("|");
const bookOrder = book => { const n = BOOKS.indexOf(book); return n < 0 ? 999 : n; };
function fileInfo(file) {
  const m = file.basename.match(/^(.+)-(\d{1,3})\.fn$/i);
  return m ? { book: m[1], chapter: Number(m[2]) } : null;
}

// Read visible link labels, excluding hidden file paths from the search.
function visibleText(text) {
  return String(text)
    .replace(/<!--[^]*?-->/g, " ").replace(/%%[^]*?%%/g, " ")
    .replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_, target, label) => label || target.split("#").pop().split("/").pop())
    .replace(/!?\[([^\]]+)\]\((?:<[^>]*>|[^)]+)\)/g, "$1")
    .replace(/<[^>]+>/g, "").replace(/\*\*|__|==|`/g, "");
}
function normalize(text) {
  return visibleText(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function parseFootnotes(markdown, file, info) {
  const notes = [];
  let current = null, lines = [], fence = null;
  const finish = () => {
    if (!current) return;
    const raw = lines.join("\n").replace(/^\s*(?:\*\*Verse:\*\*|\*\*Verse\*\*:|Verse:).*$/gmi, "").trim();
    const text = visibleText(raw).replace(/\s+/g, " ").trim();
    notes.push({ ...info, ...current, path: file.path, raw, text,
      normalized: normalize(current.word + " " + text) });
    current = null; lines = [];
  };
  const clean = markdown.replace(/^---\s*\r?\n[^]*?\r?\n---\s*(?:\r?\n|$)/, "")
    .replace(/<!--[^]*?-->/g, "").replace(/%%[^]*?%%/g, "");
  for (const line of clean.split(/\r?\n/)) {
    const f = line.match(/^\s*(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const h = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
    if (h) {
      if (current && h[1].length <= current.level) finish();
      const heading = h[2].replace(/\s+#+\s*$/, "");
      const m = heading.replace(/\*\*/g, "").match(/^Footnote\s+(\d+)\.(\d+)(?:\s*[—–-]\s*(.*))?$/i);
      if (m) {
        finish();
        current = { verse: Number(m[1]), note: Number(m[2]), word: m[3] || "",
          heading, level: h[1].length };
        continue;
      }
    }
    if (current) lines.push(line);
  }
  finish();
  return notes;
}
function queryTerms(query) {
  const quoted = [...query.matchAll(/["“]([^"”]+)["”]/g)].map(m => normalize(m[1]));
  const words = normalize(query.replace(/["“]([^"”]+)["”]/g, " ")).split(" ");
  return [...new Set([...quoted, ...words].filter(Boolean))];
}
function matchesNote(note, terms, whole) {
  return terms.every(term => whole
    ? (" " + note.normalized + " ").includes(" " + term + " ")
    : note.normalized.includes(term));
}
// CORE END

const root = dv.container;
root.classList.add("footnote-search");
const sourcePath = dv.current().file.path;
const el = (tag, text, parent, cls) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (cls) node.className = cls;
  parent.appendChild(node); return node;
};
el("style", `
  .footnote-search { max-width: 900px; }
  .footnote-search .fs-controls, .footnote-search .fs-options { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
  .footnote-search .fs-input { flex:1; min-width:180px; padding:10px 12px; }
  .footnote-search .fs-options label { display:flex; gap:6px; align-items:center; font-size:var(--font-ui-small); }
  .footnote-search .fs-status, .footnote-search .fs-warning { color:var(--text-muted); font-size:var(--font-ui-small); margin:8px 0; }
  .footnote-search .fs-results { padding:0; list-style:none; margin:0; }
  .footnote-search .fs-result { border-bottom:1px solid var(--background-modifier-border); padding:14px 0; line-height:1.6; }
  .footnote-search .fs-title { font-weight:600; }
  .footnote-search .fs-word { color:var(--text-muted); margin-left:8px; }
  .footnote-search .fs-preview { margin-top:5px; }
  .footnote-search details { margin-top:6px; }
  .footnote-search summary { cursor:pointer; color:var(--text-muted); font-size:var(--font-ui-small); }
  .footnote-search .fs-full { white-space:pre-wrap; margin-top:8px; }
  .footnote-search mark { background:var(--text-highlight-bg); color:var(--text-normal); }
  .footnote-search .fs-more { margin-top:14px; }
`, root);
const controls = el("div", null, root, "fs-controls");
const input = el("input", null, controls, "fs-input");
input.type = "search"; input.placeholder = 'Word, keywords, or "exact phrase"…';
input.setAttribute("aria-label", "Search footnote text");
const searchButton = el("button", "Search", controls, "mod-cta"); searchButton.type = "button";
const refreshButton = el("button", "Refresh", controls); refreshButton.type = "button";
const options = el("div", null, root, "fs-options");
const bookSelect = el("select", null, options); bookSelect.setAttribute("aria-label", "Filter by book");
el("option", "All books", bookSelect).value = "";
const label = el("label", null, options);
const wholeInput = el("input", null, label); wholeInput.type = "checkbox";
el("span", "Whole words only", label);
const status = el("div", "Loading footnotes…", root, "fs-status"); status.setAttribute("role", "status");
const warning = el("div", "", root, "fs-warning");
const results = el("ol", null, root, "fs-results");
const more = el("button", "Show more", root, "fs-more"); more.hidden = true;
let allNotes = [], matches = [], shown = 0, activeTerms = [], busy = false;
const cache = new Map();

async function indexFootnotes(force = false) {
  const folder = CONFIG.bibleRoot.replace(/^\/+|\/+$/g, "");
  const files = app.vault.getMarkdownFiles().filter(f => fileInfo(f) && (!folder || f.path.startsWith(folder + "/")));
  const live = new Set(files.map(f => f.path));
  for (const path of cache.keys()) if (!live.has(path)) cache.delete(path);
  const failures = [], unparsed = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, files.length) }, async () => {
    while (next < files.length) {
      const file = files[next++], key = file.stat.mtime + ":" + file.stat.size;
      if (force || cache.get(file.path)?.key !== key) {
        try {
          const notes = parseFootnotes(await app.vault.cachedRead(file), file, fileInfo(file));
          cache.set(file.path, { key, notes });
        } catch { failures.push(file.path); cache.delete(file.path); }
      }
      if (cache.get(file.path)?.notes.length === 0) unparsed.push(file.path);
    }
  }));
  allNotes = [...cache.values()].flatMap(v => v.notes).sort((a,b) =>
    bookOrder(a.book) - bookOrder(b.book) || a.book.localeCompare(b.book) || a.chapter-b.chapter || a.verse-b.verse || a.note-b.note || a.path.localeCompare(b.path));
  const selected = bookSelect.value;
  bookSelect.replaceChildren(); el("option", "All books", bookSelect).value = "";
  [...new Set(allNotes.map(n => n.book))].forEach(book => { el("option", book, bookSelect).value = book; });
  if ([...bookSelect.options].some(o => o.value === selected)) bookSelect.value = selected;
  warning.textContent = [
    !files.length ? 'No Book-01.fn.md files found. Check the filenames or bibleRoot setting.' : "",
    failures.length ? `${failures.length} file(s) could not be read: ${failures.join(", ")}` : "",
    unparsed.length ? `${unparsed.length} file(s) have no recognized “### Footnote 1.1 — word” headings: ${unparsed.join(", ")}` : ""
  ].filter(Boolean).join(" ");
}
function internalLink(parent, target, title, source) {
  const link = el("a", title, parent, "internal-link");
  link.href = "#"; link.dataset.href = target; link.title = target;
  link.addEventListener("click", event => {
    event.preventDefault(); event.stopPropagation();
    app.workspace.openLinkText(target, source, event.ctrlKey || event.metaKey);
  });
  return link;
}
function highlight(parent, text) {
  const escaped = activeTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")).sort((a,b) => b.length-a.length);
  if (!escaped.length) { parent.append(document.createTextNode(text)); return; }
  const re = new RegExp(escaped.join("|"), "giu");
  let last = 0;
  for (const m of text.matchAll(re)) {
    parent.append(document.createTextNode(text.slice(last, m.index)));
    el("mark", m[0], parent); last = m.index + m[0].length;
  }
  parent.append(document.createTextNode(text.slice(last)));
}
function fullText(parent, raw, source) {
  const re = /!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\((<[^>]+>|[^)]+)\)/g;
  let last = 0;
  for (const m of raw.matchAll(re)) {
    highlight(parent, visibleText(raw.slice(last, m.index)));
    const target = (m[1] || m[4]).replace(/^<|>$/g, "");
    const text = m[2] || m[3] || target.split("#").pop().split("/").pop();
    if (/^[a-z][\w+.-]*:/i.test(target)) highlight(parent, text);
    else { const a = internalLink(parent, target, "", source); highlight(a, text); }
    last = m.index + m[0].length;
  }
  highlight(parent, visibleText(raw.slice(last)));
}
function preview(text) {
  const lower = text.toLowerCase();
  const positions = activeTerms.map(t => lower.indexOf(t)).filter(i => i >= 0);
  const hit = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, hit - 90), end = Math.min(text.length, start + CONFIG.previewLength);
  return (start ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}
function appendResults() {
  const end = Math.min(matches.length, shown + CONFIG.pageSize);
  for (const note of matches.slice(shown, end)) {
    const row = el("li", null, results, "fs-result");
    const title = el("div", null, row, "fs-title");
    internalLink(title, note.path + "#" + note.heading,
      `${note.book} ${note.chapter}:${note.verse} · note ${note.note}`, sourcePath);
    if (note.word) el("span", "— " + note.word, title, "fs-word");
    highlight(el("div", null, row, "fs-preview"), preview(note.text));
    const details = el("details", null, row);
    el("summary", "Read full footnote", details);
    let rendered = false;
    details.addEventListener("toggle", () => {
      if (details.open && !rendered) {
        rendered = true; fullText(el("div", null, details, "fs-full"), note.raw, note.path);
      }
    });
  }
  shown = end; more.hidden = shown >= matches.length;
  more.textContent = `Show ${Math.min(CONFIG.pageSize, matches.length-shown)} more`;
  status.textContent = `${matches.length.toLocaleString()} matching footnote${matches.length === 1 ? "" : "s"} · showing ${shown.toLocaleString()} · ${allNotes.length.toLocaleString()} footnotes available`;
}
function renderResults() {
  results.replaceChildren(); more.hidden = true; shown = 0;
  activeTerms = queryTerms(input.value);
  if (!activeTerms.length) {
    status.textContent = `Ready — ${allNotes.length.toLocaleString()} footnotes. Enter a word or phrase to search.`; return;
  }
  matches = allNotes.filter(n => (!bookSelect.value || n.book === bookSelect.value) && matchesNote(n, activeTerms, wholeInput.checked));
  appendResults();
  if (!matches.length) el("li", "No matching footnotes.", results, "fs-result");
}
async function run(force = false) {
  if (busy) return;
  busy = true; searchButton.disabled = refreshButton.disabled = true; more.disabled = true;
  status.textContent = "Checking footnotes…";
  try { await indexFootnotes(force); renderResults(); }
  catch (error) { status.textContent = "Could not load footnotes: " + error.message; }
  finally { busy = false; searchButton.disabled = refreshButton.disabled = more.disabled = false; }
}
searchButton.addEventListener("click", () => run());
refreshButton.addEventListener("click", () => run(true));
input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); run(); } });
input.addEventListener("search", () => { if (!input.value) renderResults(); });
bookSelect.addEventListener("change", renderResults);
wholeInput.addEventListener("change", renderResults);
more.addEventListener("click", appendResults);
await run();
```

%%
SETUP
1. Put this Markdown file anywhere inside your Obsidian vault.
2. Enable Dataview and its Enable JavaScript Queries setting.
3. Open this note in Reading view.

Searches Book-01.fn.md files throughout the vault by default. To limit it to one
folder, set CONFIG.bibleRoot to that folder's vault-relative path.
Recognizes individual headings such as ### Footnote 25.6 — infants.
Searches each footnote's word/title and body; ignores its Verse metadata line.
Several unquoted words must all occur within the same footnote, in any order.
Quotation marks keep words together as a phrase (case and punctuation ignored).
Whole words only prevents life from matching lifetime. Without it, partial words match.
The text preview highlights literal matches; accent/punctuation-normalized matches
may match the search without every occurrence being highlighted.
Every Search checks for new, modified, renamed, and deleted footnote files.
Refresh rebuilds the page's index. No file contents are changed by this page.
The results are literal text matches, not a conceptual/semantic search.
%%
