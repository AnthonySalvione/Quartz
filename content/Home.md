---
tags:
  - dashboard
cssclasses:
  - home-dashboard
---

```dataviewjs
// HOME — edit these settings as your page develops.
const SETTINGS = {
  requesterPath: "", // Exact vault path if needed, e.g. "Tools/Verse Search.md"
  bibleFolder: "",   // Optional: restrict Bible detection to one folder.
  recentLimit: 100, // Maximum rows in the scrollable recent list.
  recentHeight: 300, // List height in pixels.
  rotationSeconds: 45,
  minimumLinks: 8,
  excludedFolders: ["Templates", "Scripts"],
  directories: [] // Optional exact paths; empty = discover top-level folders.
};

const source = dv.current().file.path;
// Only the selected note's home-pinned and home-pin-order properties are edited.
const storageKey = "anthony-home-v2:" + (app.vault.adapter.getBasePath?.() || app.vault.getName()) + ":" + source;
function recall(key, fallback) {
  try { return JSON.parse(window.sessionStorage.getItem(storageKey + key)) ?? fallback; }
  catch { return fallback; }
}
function remember(key, value) {
  try { window.sessionStorage.setItem(storageKey + key, JSON.stringify(value)); } catch {}
}
const files = app.vault.getMarkdownFiles();
const byPath = new Map(files.map(f => [f.path, f]));
const root = document.createElement("div");
root.className = "anthony-home";
dv.container.appendChild(root);
function el(tag, text, parent = root, cls = "") {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (cls) node.className = cls;
  parent.appendChild(node);
  return node;
}
function button(text, parent, action) {
  const b = el("button", text, parent);
  b.type = "button";
  b.addEventListener("click", async event => {
    try { await action(event); }
    catch (error) { feedback("Could not complete that action: " + (error.message || error)); }
  });
  return b;
}
function link(file, parent, label = file.basename, heading = "") {
  const target = file.path + (heading ? "#" + heading : "");
  const a = el("a", label, parent, "internal-link");
  a.setAttribute("href", target);
  a.setAttribute("data-href", target);
  a.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    app.workspace.openLinkText(target, source, event.ctrlKey || event.metaKey);
  });
  return a;
}
const feedbackBox = el("div", "", root, "home-feedback");
feedbackBox.setAttribute("role", "status");
feedbackBox.setAttribute("aria-live", "polite");
function feedback(message) { feedbackBox.textContent = message; }
const style = el("style", null);
style.textContent = `
.markdown-preview-view.home-dashboard { --file-line-width:1060px; }
.anthony-home { --home-border:var(--background-modifier-border); color:var(--text-normal); max-width:1060px; margin:0 auto; container-type:inline-size; }
.anthony-home * { box-sizing:border-box; }
.anthony-home .home-eyebrow { font-size:.72rem; text-transform:uppercase; letter-spacing:.13em; color:var(--text-muted); margin-bottom:10px; }
.anthony-home h1 { font-size:2.5rem; margin:0 0 8px; line-height:1.15; }
.anthony-home .home-subtitle { color:var(--text-muted); margin:0 0 26px; }
.anthony-home h2 { font-size:1.12rem; margin:0; line-height:1.3; }
.anthony-home h3 { font-size:1rem; margin:0 0 12px; }
.anthony-home .home-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.anthony-home .home-panel { padding:20px; border:1px solid var(--home-border); border-radius:12px; background:var(--background-primary); min-width:0; }
.anthony-home .home-wide { grid-column:1 / -1; }
.anthony-home .home-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
.anthony-home .home-muted { color:var(--text-muted); font-size:.86rem; line-height:1.55; }
.anthony-home .home-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.anthony-home .home-stack { display:flex; flex-direction:column; gap:12px; }
.anthony-home a { color:var(--text-normal); text-decoration:underline; text-decoration-color:var(--text-faint); text-underline-offset:3px; cursor:pointer; overflow-wrap:anywhere; }
.anthony-home a:hover { color:var(--text-accent); }
.anthony-home button { cursor:pointer; border-radius:7px; box-shadow:none; min-height:32px; font-size:.87rem; }
.anthony-home .home-primary { background:var(--background-secondary); font-weight:600; }
.anthony-home select,.anthony-home input { max-width:100%; min-height:34px; border-radius:7px; font-size:.9rem; }
.anthony-home .home-reference { flex:1; min-width:160px; }
.anthony-home .home-status { min-height:1.4em; margin-top:10px; }
.anthony-home ul { padding-left:18px; margin:0; }
.anthony-home li { margin:0 0 9px; }
.anthony-home .home-path { display:block; font-size:.76rem; color:var(--text-muted); margin-top:3px; overflow-wrap:anywhere; }
.anthony-home .home-cards { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.anthony-home .home-card { border:1px solid var(--home-border); border-radius:9px; padding:15px; min-width:0; background:var(--background-secondary); }
.anthony-home .home-card > a { display:block; font-weight:600; font-size:1rem; margin-bottom:5px; }
.anthony-home .home-card ul { margin-top:14px; font-size:.84rem; }
.anthony-home .home-directory { display:grid; grid-template-columns:minmax(150px,1fr) minmax(0,2fr); gap:20px; }
.anthony-home .home-folder-buttons { display:flex; flex-direction:column; gap:6px; align-items:stretch; }
.anthony-home .home-folder-buttons button { text-align:left; height:auto; white-space:normal; padding:8px 12px; overflow-wrap:anywhere; }
.anthony-home .home-folder-buttons button[aria-pressed=true] { background:var(--background-modifier-hover); font-weight:600; }
.anthony-home .home-folder-content { min-width:0; }
.anthony-home .home-feedback:empty { display:none; }
.anthony-home .home-feedback { padding:10px 14px; border:1px solid var(--home-border); border-radius:8px; margin-bottom:16px; font-size:.86rem; }
.anthony-home .home-topline { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
.anthony-home .home-topline .home-eyebrow { margin:0; }
.anthony-home .home-stats { display:flex; gap:18px; flex-wrap:wrap; padding:0 0 24px; font-size:.82rem; color:var(--text-muted); }
.anthony-home .home-stats strong { color:var(--text-normal); font-weight:600; }
.anthony-home .home-panel { background:linear-gradient(145deg,var(--background-primary),var(--background-primary-alt,var(--background-primary))); border-radius:15px; padding:22px; }
.anthony-home .home-panel h2 { font-size:1.2rem; font-weight:650; letter-spacing:-.02em; }
.anthony-home .home-pins { border-top:3px solid var(--text-faint); }
.anthony-home .home-pin-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:14px; }
.anthony-home .home-note-row { display:flex; gap:12px; align-items:center; justify-content:space-between; min-width:0; padding:12px; background:var(--background-secondary); border:1px solid var(--home-border); border-radius:9px; }
.anthony-home .home-note-info { min-width:0; flex:1 1 160px; }
.anthony-home .home-note-info>a { font-weight:550; }
.anthony-home .home-note-actions { display:flex; gap:4px; flex-shrink:0; align-items:center; margin-left:auto; }
.anthony-home .home-note-actions button { min-width:30px; padding:3px 7px; font-size:.78rem; }
.anthony-home .home-find { margin-top:16px; padding-top:16px; border-top:1px solid var(--home-border); }
.anthony-home .home-find input { width:100%; }
.anthony-home .home-results { display:flex; flex-direction:column; gap:7px; margin-top:10px; max-height:340px; overflow:auto; }
.anthony-home .home-recent-scroll { overflow-y:auto; overscroll-behavior:contain; scrollbar-gutter:stable; }
.anthony-home ul.home-recent-list { list-style:none; margin:0; padding:0 6px 0 0; }
.anthony-home .home-recent-list li { display:flex; align-items:baseline; gap:12px; margin:0; padding:7px 0; border-bottom:1px solid var(--home-border); min-width:0; }
.anthony-home .home-recent-list li:last-child { border-bottom:0; }
.anthony-home .home-recent-list a { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.86rem; }
.anthony-home .home-recent-list time { flex-shrink:0; font-size:.72rem; color:var(--text-muted); }
.anthony-home .home-recent-caption { margin-top:10px; font-size:.74rem; }
.anthony-home .home-undo { margin-top:12px; }
.anthony-home button:disabled { cursor:default; opacity:.45; }
.anthony-home button[aria-pressed=true] { background:var(--background-modifier-hover); font-weight:600; }
.anthony-home :is(button,input,select,a):focus-visible { outline:2px solid var(--text-accent); outline-offset:3px; }
.anthony-home .home-footer { margin-top:20px; font-size:.78rem; color:var(--text-muted); }
@container(max-width:650px) { .anthony-home .home-grid,.anthony-home .home-cards,.anthony-home .home-directory,.anthony-home .home-pin-list { grid-template-columns:1fr; } .anthony-home .home-note-row { flex-wrap:wrap; } .anthony-home .home-wide { grid-column:auto; } }
@media(max-width:650px) { .anthony-home .home-grid,.anthony-home .home-cards,.anthony-home .home-directory,.anthony-home .home-pin-list { grid-template-columns:1fr; } .anthony-home .home-note-row { flex-wrap:wrap; } .anthony-home .home-wide { grid-column:auto; } .anthony-home h1 { font-size:2.1rem; } }
`;
const topline = el("div", null, root, "home-topline");
el("div", "YOUR STUDY DESK", topline, "home-eyebrow");
el("div", new Date().toLocaleDateString(undefined, {weekday:"long", month:"long", day:"numeric"}), topline, "home-muted");
el("h1", "Home");
el("p", "Scripture, study, and the notes you want to return to.", root, "home-subtitle");
const grid = el("div", null, root, "home-grid");
function panel(title, wide = false) {
  const p = el("section", null, grid, "home-panel" + (wide ? " home-wide" : ""));
  const head = el("div", null, p, "home-head");
  el("h2", title, head);
  return { p, head };
}
function normalize(value) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
const bookNames = "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation".split("|");
const aliases = new Map(bookNames.map(name => [normalize(name), name]));
aliases.set("psalm", "Psalms");
aliases.set("songofsolomon", "Song of Songs");
const shortNames = "gen|exo|lev|num|deut|josh|judg|ruth|1sam|2sam|1kings|2kings|1chron|2chron|ezra|neh|esth|job|ps|prov|eccl|song|isa|jer|lam|ezek|dan|hos|joel|amos|obad|jonah|mic|nah|hab|zeph|hag|zech|mal|matt|mark|luke|john|acts|rom|1cor|2cor|gal|eph|phil|col|1thes|2thes|1tim|2tim|titus|philem|heb|james|1pet|2pet|1john|2john|3john|jude|rev".split("|");
shortNames.forEach((name, i) => aliases.set(name, bookNames[i]));
const bible = new Map();
const biblePaths = new Set();
for (const file of files) {
  if (SETTINGS.bibleFolder && !file.path.startsWith(SETTINGS.bibleFolder.replace(/\/$/, "") + "/")) continue;
  const match = file.basename.match(/^(.+)-(\d{1,3})$/);
  if (!match) continue;
  const book = aliases.get(normalize(match[1]));
  if (!book) continue;
  const chapter = Number(match[2]);
  if (chapter < 1) continue;
  const key = book + ":" + chapter;
  if (!bible.has(key)) bible.set(key, []);
  bible.get(key).push(file);
  biblePaths.add(file.path);
}
function excluded(file) {
  return file.path === source || SETTINGS.excludedFolders.some(folder =>
    file.path.split("/").slice(0, -1).some(part => part.toLowerCase() === folder.toLowerCase())
  );
}
function studyNote(file) {
  return !excluded(file) && !biblePaths.has(file.path) && !/\.(fn|xref)$/i.test(file.basename);
}

const requester = panel("Verse requester");
el("p", "Search a reference, phrase, or word in your existing requester page.", requester.p, "home-muted");
const candidates = SETTINGS.requesterPath
  ? files.filter(f => f.path === SETTINGS.requesterPath)
  : files.filter(f => /verse[\s_-]*(search|requester)|scripture[\s_-]*search/i.test(f.basename));
if (candidates.length) {
  const area = el("div", null, requester.p, "home-stack");
  candidates.forEach(f => link(f, area));
} else {
  el("div", "Set requesterPath at the top of this note to your requester’s exact vault path.", requester.p, "home-muted");
}

const navigator = panel("Open the Bible");
const nav = el("div", null, navigator.p, "home-row");
const bookSelect = el("select", null, nav);
bookSelect.setAttribute("aria-label", "Bible book");
bookNames.forEach(book => {
  const option = el("option", book, bookSelect);
  option.value = book;
});
const chapterSelect = el("select", null, nav);
chapterSelect.setAttribute("aria-label", "Chapter");
const verseInput = el("input", null, nav);
verseInput.type = "number"; verseInput.min = "1"; verseInput.placeholder = "Verse";
verseInput.style.width = "76px";
verseInput.setAttribute("aria-label", "Optional verse");
const status = el("div", "", navigator.p, "home-muted home-status");
function fillChapters() {
  chapterSelect.replaceChildren();
  const chapters = [...bible.keys()].filter(k => k.startsWith(bookSelect.value + ":"))
    .map(k => Number(k.split(":")[1])).sort((a, b) => a - b);
  for (const n of chapters) { const o = el("option", String(n), chapterSelect); o.value = String(n); }
  chapterSelect.disabled = !chapters.length;
  status.textContent = chapters.length ? "Choose a chapter; verse is optional." : "No chapter files found for this book.";
}
function openPassage(book, chapter, verse = "") {
  let found = bible.get(book + ":" + Number(chapter)) || [];
  if (!found.length) { status.textContent = "That chapter was not found in your vault."; return; }
  if (verse) {
    if (!/^\d+$/.test(String(verse)) || Number(verse) < 1) { status.textContent = "Enter a positive verse number."; return; }
    found = found.filter(file => app.metadataCache.getFileCache(file)?.headings?.some(h => h.heading.toLowerCase() === "v" + Number(verse)));
    if (!found.length) { status.textContent = "That verse heading was not found in this chapter."; return; }
  }
  if (found.length > 1) {
    status.replaceChildren();
    el("span", "Choose the chapter copy: ", status);
    found.forEach(f => link(f, el("div", null, status), f.path, verse ? "v" + Number(verse) : ""));
    return;
  }
  const file = found[0];
  status.textContent = "Opening " + book + " " + Number(chapter) + (verse ? ":" + Number(verse) : "") + "…";
  app.workspace.openLinkText(file.path + (verse ? "#v" + Number(verse) : ""), source, false);
}
button("Open", nav, () => openPassage(bookSelect.value, chapterSelect.value, verseInput.value)).className = "home-primary";
bookSelect.addEventListener("change", fillChapters);
fillChapters();
const direct = el("div", null, navigator.p, "home-row");
direct.style.marginTop = "12px";
const ref = el("input", null, direct, "home-reference");
ref.placeholder = "John 17:3 or 1 Cor. 12:12";
ref.setAttribute("aria-label", "Bible reference");
function jump() {
  const match = ref.value.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
  const book = match && aliases.get(normalize(match[1]));
  if (!book) { status.textContent = "Use a book and chapter, such as John 17:3."; return; }
  openPassage(book, match[2], match[3] || "");
}
button("Go", direct, jump);
ref.addEventListener("keydown", event => { if (event.key === "Enter") jump(); });

// Keep close: existing pins are recognized without migration.
const pinState = new Map();
for (const file of files) {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter || {};
  if (file.path !== source && fm["home-pinned"] === true) {
    pinState.set(file.path, Number.isFinite(fm["home-pin-order"]) ? fm["home-pin-order"] : 0);
  }
}
let pinBusy = false;
const pinned = panel("Keep close", true);
pinned.p.classList.add("home-pins");
grid.prepend(pinned.p);
const pinCount = el("span", "", pinned.head, "home-muted");
const pinList = el("div", null, pinned.p, "home-pin-list");
const undoArea = el("div", null, pinned.p, "home-row home-undo");
const finder = el("div", null, pinned.p, "home-find");
const findLabel = el("label", "Find a note to open or keep close", finder, "home-muted");
const findInput = el("input", null, finder);
findInput.id = "home-find-" + Math.random().toString(36).slice(2);
findLabel.htmlFor = findInput.id;
findInput.type = "search";
findInput.placeholder = "Search note titles or folders…";
const findSummary = el("div", "", finder, "home-muted");
findSummary.setAttribute("aria-live", "polite");
const findResults = el("div", null, finder, "home-results");
function pinnedEntries() {
  return [...pinState].map(([path, order]) => ({file: app.vault.getAbstractFileByPath(path), order}))
    .filter(entry => entry.file?.extension === "md")
    .sort((a,b) => a.order - b.order || a.file.path.localeCompare(b.file.path));
}
function noteInfo(file, row) {
  const info = el("div", null, row, "home-note-info");
  link(file, info);
  el("span", file.parent?.path && file.parent.path !== "/" ? file.parent.path : "Vault root", info, "home-path");
  return info;
}
function pinButton(label, parent, action, description) {
  const b = button(label, parent, action);
  b.dataset.pinAction = "true";
  b.disabled = pinBusy;
  if (description) { b.setAttribute("aria-label", description); b.title = description; }
  return b;
}
async function savePin(file, enabled, order, undo = null) {
  if (pinBusy) return;
  pinBusy = true;
  root.querySelectorAll("[data-pin-action]").forEach(b => b.disabled = true);
  try {
    const target = app.vault.getAbstractFileByPath(file.path);
    if (!target || target.extension !== "md") throw new Error("This note was moved or removed. Reopen Home and try again.");
    if (typeof app.fileManager.processFrontMatter !== "function") throw new Error("Update Obsidian to use the pin controls.");
    await app.fileManager.processFrontMatter(target, fm => {
      if (enabled) { fm["home-pinned"] = true; fm["home-pin-order"] = order; }
      else { delete fm["home-pinned"]; delete fm["home-pin-order"]; }
    });
    if (enabled) pinState.set(target.path, order);
    else pinState.delete(target.path);
    // Session storage keeps Undo available through Dataview's automatic rerenders.
    remember(":undo", undo);
    feedback(enabled ? "Saved “" + target.basename + "” in Keep close." : "Removed “" + target.basename + "” from Keep close.");
  } catch (error) {
    feedback("Could not save this change: " + (error.message || error));
  } finally {
    pinBusy = false;
    renderPins();
    renderFind();
  }
}
function addPin(file) {
  if (pinState.has(file.path)) return;
  const max = Math.max(0, ...pinState.values());
  return savePin(file, true, max + 1024);
}
async function movePin(index, direction) {
  const entries = pinnedEntries();
  const item = entries[index];
  const nextIndex = index + direction;
  if (!item || nextIndex < 0 || nextIndex >= entries.length) return;
  entries.splice(index, 1);
  entries.splice(nextIndex, 0, item);
  const before = entries[nextIndex - 1]?.order;
  const after = entries[nextIndex + 1]?.order;
  const order = before === undefined ? after - 1024 : after === undefined ? before + 1024 : (before + after) / 2;
  // Older pins can share order zero. Normalize only if a move needs a gap.
  if (before !== undefined && after !== undefined && !(order > before && order < after)) {
    if (pinBusy) return;
    pinBusy = true;
    root.querySelectorAll("[data-pin-action]").forEach(b => b.disabled = true);
    let normalized = false;
    try {
      // Assign distinct positions to legacy pins before applying this move.
      const original = pinnedEntries();
      for (let i = 0; i < original.length; i++) {
        const entry = original[i];
        const rank = (i + 1) * 1024;
        await app.fileManager.processFrontMatter(entry.file, fm => { fm["home-pin-order"] = rank; });
        pinState.set(entry.file.path, rank);
      }
      normalized = true;
    } catch (error) {
      feedback("Could not reorder these notes: " + (error.message || error));
    } finally {
      pinBusy = false;
      renderPins(); renderFind();
    }
    if (normalized) return movePin(index, direction);
    return;
  }
  return savePin(item.file, true, order);
}
function renderPins() {
  pinList.replaceChildren(); undoArea.replaceChildren();
  const entries = pinnedEntries();
  pinCount.textContent = entries.length + (entries.length === 1 ? " note" : " notes");
  if (!entries.length) el("p", "Keep your current outlines, reading, and useful tools within reach. Find a note below and choose Add.", pinList, "home-muted");
  entries.forEach(({file, order}, index) => {
    const row = el("div", null, pinList, "home-note-row");
    noteInfo(file, row);
    const actions = el("div", null, row, "home-note-actions");
    const up = pinButton("↑", actions, () => movePin(index, -1), "Move " + file.basename + " up");
    up.disabled = pinBusy || index === 0;
    const down = pinButton("↓", actions, () => movePin(index, 1), "Move " + file.basename + " down");
    down.disabled = pinBusy || index === entries.length - 1;
    pinButton("Remove", actions, () => savePin(file, false, order, {path:file.path, order, expires:Date.now()+300000}), "Remove " + file.basename + " from Keep close");
  });
  const undo = recall(":undo", null);
  if (undo && undo.expires > Date.now() && !pinState.has(undo.path)) {
    const file = app.vault.getAbstractFileByPath(undo.path);
    if (file?.extension === "md") {
      el("span", "Removed “" + file.basename + "”.", undoArea, "home-muted");
      pinButton("Undo", undoArea, () => savePin(file, true, undo.order));
    }
  }
}
function renderFind() {
  findResults.replaceChildren();
  const words = findInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) { findSummary.textContent = "Search by title or folder. You can add as many notes as you need."; return; }
  const found = app.vault.getMarkdownFiles().filter(f => f.path !== source && words.every(word => f.path.toLowerCase().includes(word)))
    .sort((a,b) => Number(!a.basename.toLowerCase().includes(words.join(" "))) - Number(!b.basename.toLowerCase().includes(words.join(" "))) || a.path.localeCompare(b.path));
  findSummary.textContent = found.length ? "Showing " + Math.min(found.length, 12) + " of " + found.length + " matching notes" : "No matching notes. Try part of the title or folder name.";
  found.slice(0,12).forEach(file => {
    const row = el("div", null, findResults, "home-note-row");
    noteInfo(file, row);
    const added = pinState.has(file.path);
    const b = pinButton(added ? "Added" : "+ Add", row, () => addPin(file), "Keep " + file.basename + " close");
    b.disabled = pinBusy || added;
  });
}
findInput.addEventListener("input", renderFind);
renderPins(); renderFind();

const recent = panel("Recent notes");
const recentModes = el("div", null, recent.head, "home-row");
const recentBody = el("div", null, recent.p);
let recentMode = recall(":recent", "created");
const recentScope = el("select", null, recent.head);
recentScope.setAttribute("aria-label", "Recent note types");
for (const [value,label] of [["all","All notes"],["study","Study notes"]]) {
  const option = el("option", label, recentScope); option.value=value;
}
recentScope.value = recall(":recentScope", "all");
recentScope.addEventListener("change", () => { remember(":recentScope",recentScope.value); renderRecent(); });
const recentCaption = el("div", "", recent.p, "home-muted home-recent-caption");
recentBody.className = "home-recent-scroll";
recentBody.style.maxHeight = Math.max(120, Number(SETTINGS.recentHeight) || 300) + "px";
recentBody.setAttribute("tabindex", "0");
recentBody.setAttribute("role", "region");
recentBody.setAttribute("aria-label", "Scrollable recent notes");
const recentButtons = [];
function renderRecent() {
  recentBody.replaceChildren();
  recentButtons.forEach(({mode,b}) => b.setAttribute("aria-pressed", String(mode === recentMode)));
  const key = recentMode === "created" ? "ctime" : "mtime";
  const candidates = app.vault.getMarkdownFiles().filter(f => f.path !== source && (recentScope.value !== "study" || studyNote(f)))
    .sort((a,b) => b.stat[key] - a.stat[key] || a.path.localeCompare(b.path));
  const limit = Math.max(1, Math.floor(Number(SETTINGS.recentLimit) || 100));
  const recentFiles = candidates.slice(0, limit);
  recentCaption.textContent = "Showing " + recentFiles.length + " of " + candidates.length + " notes · " + (recentMode === "created" ? "newest created first" : "most recently edited first");
  if (!recentFiles.length) el("p", "Your notes will appear here, including notes created by commands and scripts.", recentBody, "home-muted");
  else {
    const list = el("ul", null, recentBody, "home-recent-list");
    recentFiles.forEach(f => {
      const item = el("li", null, list);
      const a = link(f, item);
      a.title = f.path;
      const time = el("time", new Date(f.stat[key]).toLocaleDateString(undefined, {month:"short",day:"numeric"}), item);
      time.dateTime = new Date(f.stat[key]).toISOString();
      time.title = new Date(f.stat[key]).toLocaleString();
    });
  }
}
for (const [mode,label] of [["created","New notes"],["edited","Recently edited"]]) {
  const b = button(label, recentModes, () => { recentMode = mode; remember(":recent",mode); renderRecent(); });
  recentButtons.push({mode,b});
}
renderRecent();
// Vault events include files generated by commands, Templater, and other plugins.
let recentTimer;
if (typeof app.vault.on === "function" && typeof dv.component.registerEvent === "function") {
  const queueRecent = () => {
    window.clearTimeout(recentTimer);
    recentTimer = window.setTimeout(() => { if (root.isConnected) renderRecent(); }, 150);
  };
  for (const event of ["create", "delete", "rename", "modify"]) dv.component.registerEvent(app.vault.on(event, queueRecent));
  dv.component.register(() => window.clearTimeout(recentTimer));
}
const shortcuts = panel("A little exploration");
shortcuts.p.style.alignSelf = "start";
el("p", "Return to something you have not opened in a while.", shortcuts.p, "home-muted");
const explore = el("div", null, shortcuts.p, "home-row");
const exploreStatus = el("div", "", shortcuts.p, "home-status home-muted");
button("Open a random study note", explore, async () => {
  const pool = app.vault.getMarkdownFiles().filter(studyNote);
  if (!pool.length) { exploreStatus.textContent = "No study notes found yet."; return; }
  const file = pool[Math.floor(Math.random()*pool.length)];
  await app.workspace.openLinkText(file.path, source, false);
});
el("p", "Bible chapters, footnotes, cross-reference files, and your excluded folders are left out of the random selection.", shortcuts.p, "home-muted");

const featured = panel("Return to these", true);
const controls = el("div", null, featured.head, "home-row");
const cards = el("div", null, featured.p, "home-cards");
const resolved = app.metadataCache.resolvedLinks || {};
function destinations(f) { return Object.keys(resolved[f.path] || {}).filter(path => path !== f.path && byPath.has(path)); }
const chosen = files.filter(f => f.path !== source && app.metadataCache.getFileCache(f)?.frontmatter?.["home-featured"] === true);
const pool = chosen.length ? chosen : files.filter(f => studyNote(f) && destinations(f).length >= SETTINGS.minimumLinks)
  .sort((a, b) => destinations(b).length - destinations(a).length).slice(0, 18);
let offset = 0;
let paused = false;
function showCards() {
  cards.replaceChildren();
  if (!pool.length) { el("p", "Add home-featured: true to your main notes to put them in this rotation.", cards, "home-muted"); return; }
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    const file = pool[(offset + i) % pool.length];
    const card = el("article", null, cards, "home-card");
    link(file, card);
    const targets = destinations(file);
    el("div", targets.length + " linked notes", card, "home-muted");
    if (targets.length) {
      const list = el("ul", null, card);
      targets.slice(0, 5).forEach(path => link(byPath.get(path), el("li", null, list)));
    }
  }
}
button("Next notes", controls, () => { offset = (offset + 3) % Math.max(1, pool.length); showCards(); });
const pause = button("Pause rotation", controls, () => {
  paused = !paused;
  pause.textContent = paused ? "Resume rotation" : "Pause rotation";
});
pause.disabled = SETTINGS.rotationSeconds <= 0 || pool.length <= 3;
showCards();
if (SETTINGS.rotationSeconds > 0 && pool.length > 3) {
  const timer = window.setInterval(() => {
    if (!root.isConnected) { window.clearInterval(timer); return; }
    if (paused || document.hidden || featured.p.matches(":hover") || featured.p.contains(document.activeElement)) return;
    offset = (offset + 3) % pool.length; showCards();
  }, SETTINGS.rotationSeconds * 1000);
  dv.component.registerInterval(timer);
}

const directory = panel("Directories", true);
const layout = el("div", null, directory.p, "home-directory");
const folders = el("div", null, layout, "home-folder-buttons");
const content = el("div", null, layout, "home-folder-content");
const available = new Set([""]);
files.filter(f => !excluded(f)).forEach(f => {
  const parts = f.path.split("/").slice(0, -1);
  parts.forEach((part, index) => available.add(parts.slice(0, index + 1).join("/")));
});
const starts = SETTINGS.directories.length ? SETTINGS.directories : [...available].filter(path => path && !path.includes("/")).sort();
let activeFolder = null;
const folderButtons = [];
function renderFolder(path, page = 0) {
  activeFolder = path;
  folderButtons.forEach(({node, path: p}) => node.setAttribute("aria-pressed", String(p === path)));
  content.replaceChildren();
  const toolbar = el("div", null, content, "home-head");
  el("h3", path || "Vault root", toolbar);
  if (path) button("Up", toolbar, () => renderFolder(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""));
  const children = [...available].filter(p => p && (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "") === path).sort();
  const sub = el("div", null, content, "home-row");
  children.forEach(p => button(p.split("/").pop() + " /", sub, () => renderFolder(p)));
  const notes = files.filter(f => !excluded(f) && (f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "") === path)
    .sort((a, b) => a.basename.localeCompare(b.basename, undefined, {numeric:true}));
  if (!notes.length) el("p", children.length ? "Choose a folder above." : "No Markdown notes in this folder.", content, "home-muted");
  else {
    const list = el("ul", null, content); list.style.marginTop = "16px";
    notes.slice(page * 12, page * 12 + 12).forEach(f => link(f, el("li", null, list)));
    if (notes.length > 12) {
      const pager = el("div", null, content, "home-row");
      button("Previous", pager, () => renderFolder(path, page - 1)).disabled = page === 0;
      el("span", (page * 12 + 1) + "–" + Math.min((page + 1) * 12, notes.length) + " of " + notes.length, pager, "home-muted");
      button("Next", pager, () => renderFolder(path, page + 1)).disabled = (page + 1) * 12 >= notes.length;
    }
  }
}
for (const path of ["", ...starts]) {
  const node = button(path || "Vault root", folders, () => renderFolder(path));
  node.setAttribute("aria-pressed", "false"); folderButtons.push({node, path});
}
renderFolder(starts[0] || "");
const stats = el("div", null, root, "home-stats");
grid.before(stats);
for (const [count,label] of [[files.filter(studyNote).length,"study notes"],[biblePaths.size,"Bible chapters"]]) {
  const item = el("span", null, stats);
  el("strong", String(count), item); item.append(" " + label);
}
el("div", "Keep close • Scripture • Recent notes • Explore", root, "home-footer");
```

%%
SETUP
1. Save this file anywhere in your Obsidian vault.
2. Enable Dataview, and enable JavaScript Queries in Dataview settings.
3. Open this note in Reading view.
4. If the requester link is missing, set requesterPath at the top to its exact vault path.
5. In Keep close, search for a note and click + Add. Use Remove, Undo, and the arrows to manage it.
   Existing home-pinned: true notes are recognized automatically.
6. For rotation, add home-featured: true to your preferred main notes.

Recent notes defaults to New notes with All notes selected, including Markdown files
created by commands/scripts, Bible chapters, and footnotes. Switch to Study notes to
filter Bible chapters, footnotes, cross references, and excluded folders.
The list scrolls and shows up to recentLimit notes (default 100); change that setting
for a longer history. recentHeight controls its height. Recently edited uses modification
times; New notes uses filesystem creation times, not the frontmatter created field.
Imported files may appear recent too. Pinning also updates a note's modification time.
Keep close saves home-pinned and home-pin-order in the selected note's Properties.
Removing a pin removes only those two properties, not the note. Undo lasts five minutes
in this app session. Note search matches titles/folders, not note contents.
The rotation prefers home-featured notes. Otherwise it uses study notes with at least
8 distinct linked Markdown notes. It rotates every 45 seconds while visible and
pauses while you hover over or focus that section. Set rotationSeconds to 0 for manual only.
Bible files use Book-01.md and verse headings ## v1. Duplicate chapters offer a choice.
The folder directory shows Markdown notes. It does not create folder notes.
The pin controls edit only the selected note's two home properties through Obsidian's
frontmatter API. Other properties and note content are preserved by that API.
Appearance follows your current theme and adapts to narrower panes.
%%
