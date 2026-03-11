<%*
/**
 * Verse (inline) — RV Cross-Reference → separate .xref file + linkify + ordering
 * Keeps cross-references separate from footnotes, RV-style.
 *
 * Updated:
 * - IDs are number-based: ^xref-book-ch-verse-N (NOT label-based)
 * - Cross-refs inside each verse group are numbered and sorted by (N)
 * - Verse groups sorted v1, v2, v3...
 * - No superscript / combo generation (reverted)
 * - Still supports auto-run context from footnote template: { word, refs, vNum }
 */

const ADD_LINK_UNDER_VERSE = true;
const XREF_FILE_SUFFIX = ".xref";

// ---------- SIMPLE HELPERS ----------
function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function verseHeadRe(vNum) {
  return new RegExp("^###\\s+v\\s*" + vNum + "\\s*$", "im");
}

function ensureSectionHeadingExists(fullText, sectionName) {
  const re = new RegExp("^##\\s+" + sectionName + "\\s*$", "im");
  if (!re.test(fullText)) return fullText.replace(/\s*$/, "") + "\n\n## " + sectionName + "\n";
  return fullText;
}

function splitSection(fullText, sectionName) {
  const re = new RegExp("^##\\s+" + sectionName + "\\s*$", "im");
  const m = re.exec(fullText);
  if (!m) return null;

  const start = m.index;
  const afterHeading = start + m[0].length;

  const nextH2 = /\n##\s+/g;
  nextH2.lastIndex = afterHeading;
  const n = nextH2.exec(fullText);
  const end = n ? (n.index + 1) : fullText.length;

  return { before: fullText.slice(0, start), section: fullText.slice(start, end), after: fullText.slice(end) };
}

function ensureVerseGroup(sectionText, sectionName, vNum) {
  const secRe = new RegExp("^##\\s+" + sectionName + "\\s*$", "im");
  const vRe = verseHeadRe(vNum);
  if (!vRe.test(sectionText)) {
    sectionText = sectionText.replace(secRe, h => h + "\n\n### v" + vNum + "\n");
  }
  return sectionText;
}

function insertAtEndOfVerseGroup(sectionText, vNum, block) {
  const vRe = verseHeadRe(vNum);
  const m = vRe.exec(sectionText);
  if (!m) return sectionText;

  const from = m.index + m[0].length;
  const nextHead = /\n(###\s+|##\s+)/g;
  nextHead.lastIndex = from;
  const n = nextHead.exec(sectionText);
  const end = n ? (n.index + 1) : sectionText.length;

  const prefix = sectionText.slice(0, end).replace(/\s*$/, "") + "\n\n";
  const suffix = sectionText.slice(end).replace(/^\s*/, "");
  return prefix + block.replace(/\s*$/, "") + "\n\n" + suffix;
}

function normalizeHeadingBulletMerges(text) {
  // "### v1- **" -> "### v1\n- **"
  return String(text || "").replace(/^(###\s+v\s*\d+)\s*(-\s+)/gmi, "$1\n$2");
}

function sortVerseGroups(sectionText, sectionName) {
  const lines = sectionText.split("\n");

  let secIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp("^##\\s+" + sectionName + "\\s*$", "i").test(lines[i])) { secIdx = i; break; }
  }
  if (secIdx === -1) return sectionText;

  const header = lines.slice(0, secIdx + 1);
  const rest = lines.slice(secIdx + 1);

  const groups = [];
  const preamble = [];
  let cur = null;

  function pushCur(){ if (cur) groups.push(cur); cur = null; }

  for (let j = 0; j < rest.length; j++) {
    const line = rest[j];
    const mm = line.match(/^###\s+v\s*(\d+)\s*$/i);
    if (mm) {
      pushCur();
      const n = parseInt(mm[1], 10);
      cur = { n, lines: ["### v" + n] };
      continue;
    }
    if (!cur) preamble.push(line);
    else cur.lines.push(line);
  }
  pushCur();

  groups.sort((a,b) => a.n - b.n);

  let out = [];
  out = out.concat(header);

  const pre = preamble.join("\n").replace(/\s*$/, "");
  if (pre.trim()) { out.push(""); out = out.concat(pre.split("\n")); }

  for (let k = 0; k < groups.length; k++) {
    out.push("");
    out = out.concat(groups[k].lines);
    out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "") + "\n";
}

// ----- numbering per verse group -----
function nextXrefNumberForVerse(sectionText, vNum) {
  const vRe = verseHeadRe(vNum);
  const m = vRe.exec(sectionText);
  if (!m) return 1;

  const start = m.index + m[0].length;
  const rest = sectionText.slice(start);

  const stop = rest.search(/\n(###\s+|##\s+)/);
  const groupText = stop === -1 ? rest : rest.slice(0, stop);

  const nums = [];
  const numRe = /^\s*-\s*\((\d+)\)\s+\*\*/gm;
  let nm;
  while ((nm = numRe.exec(groupText)) !== null) nums.push(parseInt(nm[1], 10));

  if (!nums.length) return 1;
  nums.sort((a,b) => a-b);
  return nums[nums.length - 1] + 1;
}

function sortXrefsInsideVerseGroup(sectionText, vNum) {
  const vRe = verseHeadRe(vNum);
  const m = vRe.exec(sectionText);
  if (!m) return sectionText;

  const headStart = m.index;
  const afterHead = headStart + m[0].length;

  const rest = sectionText.slice(afterHead);
  const stop = rest.search(/\n(###\s+|##\s+)/);
  const groupEnd = stop === -1 ? sectionText.length : (afterHead + stop + 1);

  const before = sectionText.slice(0, afterHead);
  const group = sectionText.slice(afterHead, groupEnd);
  const after = sectionText.slice(groupEnd);

  // split on numbered bullets
  const parts = group.split(/\n(?=-\s*\(\d+\)\s+\*\*)/g);

  const sortable = [];
  const other = [];

  for (const p of parts) {
    if (/^\s*-\s*\(\d+\)\s+\*\*/.test(p.trim())) sortable.push(p);
    else other.push(p);
  }

  sortable.sort((a, b) => {
    const am = a.match(/-\s*\((\d+)\)/);
    const bm = b.match(/-\s*\((\d+)\)/);
    const an = am ? parseInt(am[1], 10) : 999999;
    const bn = bm ? parseInt(bm[1], 10) : 999999;
    return an - bn;
  });

  let rebuilt =
    other.join("").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "") +
    (other.join("").trim() ? "\n\n" : "") +
    sortable.join("\n\n").trim();

  rebuilt = rebuilt.replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "") + "\n";
  return before + rebuilt + after;
}

// ---------- MAIN ----------
const chapterFile = tp.file.find_tfile(tp.file.path(true));
let chapterText = await app.vault.read(chapterFile);

const chapterTitle = String(tp.file.title ?? "").trim(); // e.g., Genesis-01
const mm = chapterTitle.match(/^(.*?)-(\d+)\s*$/);
const book = mm ? mm[1].trim() : chapterTitle;
const chapterNum = mm ? String(parseInt(mm[2], 10)) : "";
const defaultBook = book || null;

// Context support (optional)
const __ctx = globalThis.__RV_XREF_CONTEXT || null;

// Verse prompt (normalize) — only prompt if not provided
let vNum;
if (__ctx?.vNum) {
  vNum = parseInt(__ctx.vNum, 10);
} else {
  const vInput = await tp.system.prompt("Verse? (type 1 or v1 or V 1)");
  if (!vInput) { tR=""; return; }
  const vMatchNum = String(vInput).match(/(\d+)/);
  if (!vMatchNum) { new Notice("Could not read verse number."); tR=""; return; }
  vNum = parseInt(vMatchNum[1], 10);
}

let label = __ctx?.word ?? await tp.system.prompt('Label (word/phrase, e.g., "beginning")');
if (!label) { tR=""; return; }
label = String(label).trim();

let xrefRaw = __ctx?.refs ?? await tp.system.prompt("Paste the RV cross-reference line(s) for this word/verse:");
if (!xrefRaw) { tR=""; return; }
xrefRaw = String(xrefRaw).replace(/\r\n/g, "\n").trim();

// cleanup context so it won't affect later runs
try { delete globalThis.__RV_XREF_CONTEXT; } catch (e) {}

// ---------- LINKIFY via shared script ----------
const xrefText = await tp.user.linkify.linkifyText(tp, xrefRaw, { defaultBook });

// xref file path
const parentPath = chapterFile.parent && chapterFile.parent.path ? chapterFile.parent.path : "";
const xrefNoteName = chapterTitle + XREF_FILE_SUFFIX; // e.g., Genesis-01.xref
const xrefFullPath = (parentPath ? (parentPath + "/") : "") + xrefNoteName + ".md";

let xrefFile = app.vault.getAbstractFileByPath(xrefFullPath);
let fullText = "";

if (!xrefFile) {
  fullText =
    "---\n" +
    "type: xref\n" +
    "chapter: " + chapterTitle + "\n" +
    "---\n\n" +
    "# " + chapterTitle + " — Cross-references\n\n" +
    "## xref\n";
  xrefFile = await app.vault.create(xrefFullPath, fullText);
} else {
  fullText = await app.vault.read(xrefFile);
}

fullText = ensureSectionHeadingExists(fullText, "xref");

const parts = splitSection(fullText, "xref");
if (!parts) { new Notice("Couldn't locate '## xref'."); tR=""; return; }

const before = parts.before;
let section = normalizeHeadingBulletMerges(parts.section);
const after = parts.after;

section = ensureVerseGroup(section, "xref", vNum);
section = normalizeHeadingBulletMerges(section);

// Number prompt like footnotes
const suggestedNum = nextXrefNumberForVerse(section, vNum);
let xrefNumRaw = await tp.system.prompt("Xref # for v" + vNum + " (Enter = " + suggestedNum + ")");
xrefNumRaw = String(xrefNumRaw || "").trim();
let xrefNum = xrefNumRaw ? parseInt(xrefNumRaw, 10) : suggestedNum;
if (!xrefNum || xrefNum < 1) xrefNum = suggestedNum;

// ID is NUMBER-based (this is what you asked for)
const baseId =
  "xref-" + slug(book) + "-" + slug(chapterNum || "x") + "-" + slug(vNum) + "-" + String(xrefNum);

let id = baseId;
let n = 2;
while (fullText.includes("^" + id)) id = baseId + "-" + (n++);

// Block (numbered, like footnotes)
const block =
  "- (" + xrefNum + ") **" + label + "** → " + xrefText + "\n" +
  "  ^" + id + "\n";

section = insertAtEndOfVerseGroup(section, vNum, block);
section = normalizeHeadingBulletMerges(section);

// Sort by (N) inside verse group, then sort verse groups
section = sortXrefsInsideVerseGroup(section, vNum);
section = sortVerseGroups(section, "xref");

fullText = before + section + after;
await app.vault.modify(xrefFile, fullText);

// Optional: link under verse in chapter note (display starts with number for ordering)
if (ADD_LINK_UNDER_VERSE) {
  const verseHeadingRe = new RegExp("^##\\s+v\\s*" + vNum + "\\s*$", "im");
  const vm = verseHeadingRe.exec(chapterText);
  if (vm) {
    const start = vm.index;
    const afterHeading = start + vm[0].length;

    const nextH2 = /\n##\s+/g;
    nextH2.lastIndex = afterHeading;
    const nx = nextH2.exec(chapterText);
    const end = nx ? (nx.index + 1) : chapterText.length;

    let verseBlock = chapterText.slice(start, end);

    // You can change display to just "1" if you want:
    // const linkLine = "- [[" + xrefNoteName + "#^" + id + "|xref (" + xrefNum + ")]]";
    const linkLine = "- [[" + xrefNoteName + "#^" + id + "|xref (" + xrefNum + ") " + label + "]]";

    if (!verseBlock.includes(linkLine)) {
      verseBlock = verseBlock.replace(/\s*$/, "") + "\n\n" + linkLine + "\n";
      chapterText = chapterText.slice(0, start) + verseBlock + chapterText.slice(end);
      await app.vault.modify(chapterFile, chapterText);
    }
  }
}

tR = "";
%>
