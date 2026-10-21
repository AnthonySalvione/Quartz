# Verse Search

```dataviewjs
// ============================================================
// SETTINGS — edit these only if your Bible folder ever changes
// ============================================================
const CONFIG = {
  bibleRoot: "Ministry Project/Recovery Version Bible",
  maximumResults: 500,
};

// ============================================================
// BIBLE BOOKS AND COMMON ABBREVIATIONS
// ============================================================
const BOOKS = [
  ["Genesis", "gen", "ge", "gn"],
  ["Exodus", "exod", "exo", "ex"],
  ["Leviticus", "lev", "le", "lv"],
  ["Numbers", "num", "nu", "nm", "nb"],
  ["Deuteronomy", "deut", "deu", "dt"],
  ["Joshua", "josh", "jos", "jsh"],
  ["Judges", "judg", "jdg", "jg"],
  ["Ruth", "ruth", "ru"],
  ["1 Samuel", "1 samuel", "1 sam", "1sa", "1 sm"],
  ["2 Samuel", "2 samuel", "2 sam", "2sa", "2 sm"],
  ["1 Kings", "1 kings", "1 kgs", "1ki", "1 kg"],
  ["2 Kings", "2 kings", "2 kgs", "2ki", "2 kg"],
  ["1 Chronicles", "1 chronicles", "1 chron", "1 chr", "1ch"],
  ["2 Chronicles", "2 chronicles", "2 chron", "2 chr", "2ch"],
  ["Ezra", "ezra", "ezr"],
  ["Nehemiah", "neh", "ne"],
  ["Esther", "esth", "est", "es"],
  ["Job", "job"],
  ["Psalms", "psalms", "psalm", "ps", "psa"],
  ["Proverbs", "proverbs", "prov", "pro", "pr"],
  ["Ecclesiastes", "ecclesiastes", "eccl", "ecc", "ec"],
  ["Song of Songs", "song of songs", "song", "songs", "sos", "ss"],
  ["Isaiah", "isaiah", "isa", "is"],
  ["Jeremiah", "jeremiah", "jer", "je"],
  ["Lamentations", "lamentations", "lam", "la"],
  ["Ezekiel", "ezekiel", "ezek", "eze", "ezk"],
  ["Daniel", "daniel", "dan", "da", "dn"],
  ["Hosea", "hosea", "hos", "ho"],
  ["Joel", "joel", "joe", "jl"],
  ["Amos", "amos", "am"],
  ["Obadiah", "obadiah", "obad", "ob"],
  ["Jonah", "jonah", "jon", "jnh"],
  ["Micah", "micah", "mic", "mi"],
  ["Nahum", "nahum", "nah", "na"],
  ["Habakkuk", "habakkuk", "hab", "hb"],
  ["Zephaniah", "zephaniah", "zeph", "zep", "zp"],
  ["Haggai", "haggai", "hag", "hg"],
  ["Zechariah", "zechariah", "zech", "zec", "zc"],
  ["Malachi", "malachi", "mal", "ml"],
  ["Matthew", "matthew", "matt", "mt"],
  ["Mark", "mark", "mk", "mrk"],
  ["Luke", "luke", "lk", "luk"],
  ["John", "john", "jn", "joh"],
  ["Acts", "acts", "act", "ac"],
  ["Romans", "romans", "rom", "ro"],
  ["1 Corinthians", "1 corinthians", "1 cor", "1co"],
  ["2 Corinthians", "2 corinthians", "2 cor", "2co"],
  ["Galatians", "galatians", "gal", "ga"],
  ["Ephesians", "ephesians", "eph", "ep"],
  ["Philippians", "philippians", "phil", "php", "pp"],
  ["Colossians", "colossians", "col", "co"],
  ["1 Thessalonians", "1 thessalonians", "1 thess", "1 thes", "1th"],
  ["2 Thessalonians", "2 thessalonians", "2 thess", "2 thes", "2th"],
  ["1 Timothy", "1 timothy", "1 tim", "1ti"],
  ["2 Timothy", "2 timothy", "2 tim", "2ti"],
  ["Titus", "titus", "tit", "ti"],
  ["Philemon", "philemon", "philem", "phm", "pm"],
  ["Hebrews", "hebrews", "heb", "he"],
  ["James", "james", "jas", "jam", "jm"],
  ["1 Peter", "1 peter", "1 pet", "1pe"],
  ["2 Peter", "2 peter", "2 pet", "2pe"],
  ["1 John", "1 john", "1 jn", "1jo"],
  ["2 John", "2 john", "2 jn", "2jo"],
  ["3 John", "3 john", "3 jn", "3jo"],
  ["Jude", "jude", "jud"],
  ["Revelation", "revelation", "rev", "re", "apocalypse"],
];

const normalizeBook = (value) => value
  .toLowerCase()
  .replace(/[._-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Search only the text that Obsidian visibly displays. For example,
// [[Matthew-01.fn#Footnote 1.1 — Jesus|Jesus]] becomes simply "Jesus".
const visibleText = (value) => String(value).replace(
  /!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
  (_, target, alias) => alias || target.split("#").pop()
);

const bookAliases = new Map();
BOOKS.forEach(([canonical, ...aliases], index) => {
  [canonical, ...aliases].forEach(alias => {
    bookAliases.set(normalizeBook(alias), { canonical, index });
  });
});

const normalizeText = (value) => visibleText(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[“”‘’]/g, "'")
  .replace(/[^\p{L}\p{N}'\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

function bookInfoFromFilename(filenameBook) {
  return bookAliases.get(normalizeBook(filenameBook)) ?? null;
}

function parseChapterFile(file) {
  const match = file.basename.match(/^(.+?)-(\d{1,3})$/);
  if (!match) return null;
  const book = bookInfoFromFilename(match[1]);
  if (!book) return null;
  return { ...book, chapter: Number(match[2]) };
}

function extractVerses(markdown, file, fileInfo) {
  const lines = markdown.split(/\r?\n/);
  const verses = [];
  let currentVerse = null;
  let currentLines = [];

  const finishVerse = () => {
    if (currentVerse === null) return;
    const text = currentLines
      .join(" ")
      .replace(/<!--([\s\S]*?)-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      verses.push({
        book: fileInfo.canonical,
        bookIndex: fileInfo.index,
        chapter: fileInfo.chapter,
        verse: currentVerse,
        text,
        normalized: normalizeText(text),
        path: file.path,
      });
    }
  };

  for (const line of lines) {
    const heading = line.match(/^##\s*v(\d+)\s*$/i);
    if (heading) {
      finishVerse();
      currentVerse = Number(heading[1]);
      currentLines = [];
    } else if (currentVerse !== null) {
      currentLines.push(line);
    }
  }
  finishVerse();
  return verses;
}

function parseReferenceQuery(query) {
  const parts = query.split(/\s*;\s*/).filter(Boolean);
  const requests = [];
  let previousBook = null;

  for (const part of parts) {
    // A book and chapter without a colon means the whole chapter.
    // Examples: Matthew 1, 1 John 3, Song of Songs 2
    const chapterOnlyMatch = part.trim().match(/^(.+?)\s+(\d+)$/);
    if (chapterOnlyMatch) {
      previousBook = bookAliases.get(normalizeBook(chapterOnlyMatch[1]));
      if (!previousBook) return null;

      requests.push({
        book: previousBook.canonical,
        chapter: Number(chapterOnlyMatch[2]),
        startVerse: 1,
        endVerse: Number.POSITIVE_INFINITY,
      });
      continue;
    }

    const match = part.trim().match(/^(?:(.+?)\s+)?(\d+):(.+)$/);
    if (!match) return null;

    const writtenBook = match[1]?.trim();
    if (writtenBook) {
      previousBook = bookAliases.get(normalizeBook(writtenBook));
      if (!previousBook) return null;
    }
    if (!previousBook) return null;

    const chapter = Number(match[2]);
    const verseParts = match[3].split(/\s*,\s*/).filter(Boolean);
    if (!verseParts.length) return null;

    for (const versePart of verseParts) {
      const verseMatch = versePart.match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
      if (!verseMatch) return null;

      const startVerse = Number(verseMatch[1]);
      const endVerse = verseMatch[2] ? Number(verseMatch[2]) : startVerse;
      requests.push({
        book: previousBook.canonical,
        chapter,
        startVerse: Math.min(startVerse, endVerse),
        endVerse: Math.max(startVerse, endVerse),
      });
    }
  }
  return requests.length ? requests : null;
}

function searchVerses(allVerses, rawQuery) {
  const query = rawQuery.trim();
  if (!query) return [];

  const references = parseReferenceQuery(query);
  if (references) {
    return allVerses.filter(item => references.some(request =>
      item.book === request.book &&
      item.chapter === request.chapter &&
      item.verse >= request.startVerse &&
      item.verse <= request.endVerse
    ));
  }

  const quotedPhrases = [...query.matchAll(/["“”]([^"“”]+)["“”]/g)]
    .map(match => normalizeText(match[1]))
    .filter(Boolean);
  const withoutQuotes = query.replace(/["“”]([^"“”]+)["“”]/g, " ");
  const keywords = normalizeText(withoutQuotes).split(" ").filter(Boolean);

  // With no quotation marks, several words are treated as keywords that must
  // all occur somewhere in the verse. Quoted text must occur as one phrase.
  return allVerses.filter(item =>
    quotedPhrases.every(phrase => item.normalized.includes(phrase)) &&
    keywords.every(keyword => item.normalized.includes(keyword))
  );
}

// Display wiki links as clickable aliases instead of showing their raw
// [[target|alias]] Markdown in the search results.
function appendVerseText(container, text, sourcePath) {
  const wikiLinkRe = /!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = wikiLinkRe.exec(text)) !== null) {
    container.append(document.createTextNode(text.slice(lastIndex, match.index)));

    const target = match[1].trim();
    const display = (match[2] || target.split("#").pop() || target).trim();
    const link = document.createElement("a");
    link.className = "internal-link";
    link.dataset.href = target;
    link.href = "#";
    link.textContent = display;
    link.title = target;
    link.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      app.workspace.openLinkText(target, sourcePath, false);
    });
    container.appendChild(link);

    lastIndex = wikiLinkRe.lastIndex;
  }

  container.append(document.createTextNode(text.slice(lastIndex)));
}

// ============================================================
// PAGE
// ============================================================
const container = dv.container;
container.classList.add("verse-search-page");

const style = document.createElement("style");
style.textContent = `
  .verse-search-page { max-width: 850px; }
  .verse-search-controls { display: flex; gap: 8px; margin: 0 0 10px; }
  .verse-search-input {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--input-radius);
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: var(--font-ui-medium);
  }
  .verse-search-input:focus {
    border-color: var(--interactive-accent);
    box-shadow: 0 0 0 2px var(--background-modifier-border-focus);
  }
  .verse-search-button {
    padding: 8px 15px;
    color: var(--text-on-accent);
    background: var(--interactive-accent);
  }
  .verse-search-status {
    min-height: 1.5em;
    margin-bottom: 8px;
    color: var(--text-muted);
    font-size: var(--font-ui-small);
  }
  .verse-search-results { margin: 0; padding: 0; list-style: none; }
  .verse-search-result {
    padding: 12px 2px;
    border-bottom: 1px solid var(--background-modifier-border);
    line-height: 1.55;
  }
  .verse-search-reference {
    display: inline-block;
    margin-right: 8px;
    font-weight: var(--font-semibold);
    white-space: nowrap;
  }
  .verse-search-empty {
    padding: 18px 0;
    color: var(--text-muted);
  }
  @media (max-width: 500px) {
    .verse-search-controls { flex-direction: column; }
    .verse-search-button { width: 100%; }
  }
`;
container.appendChild(style);

const controls = document.createElement("div");
controls.className = "verse-search-controls";

const input = document.createElement("input");
input.className = "verse-search-input";
input.type = "search";
input.placeholder = "Reference, phrase, or keywords…";
input.setAttribute("aria-label", "Search Bible verses");

const button = document.createElement("button");
button.className = "verse-search-button";
button.type = "button";
button.textContent = "Search";

controls.append(input, button);
container.appendChild(controls);

const status = document.createElement("div");
status.className = "verse-search-status";
status.textContent = "Indexing verses…";
container.appendChild(status);

const resultsList = document.createElement("ol");
resultsList.className = "verse-search-results";
container.appendChild(resultsList);

const bibleFiles = app.vault.getMarkdownFiles()
  .filter(file => file.path.startsWith(`${CONFIG.bibleRoot}/`))
  .map(file => ({ file, info: parseChapterFile(file) }))
  .filter(entry => entry.info);

const verseGroups = await Promise.all(bibleFiles.map(async ({ file, info }) => {
  const markdown = await app.vault.cachedRead(file);
  return extractVerses(markdown, file, info);
}));

const allVerses = verseGroups.flat().sort((a, b) =>
  a.bookIndex - b.bookIndex ||
  a.chapter - b.chapter ||
  a.verse - b.verse
);

status.textContent = allVerses.length
  ? `Ready — ${allVerses.length.toLocaleString()} verses indexed`
  : `No verses found under “${CONFIG.bibleRoot}”.`;

function showResults() {
  const query = input.value.trim();
  resultsList.replaceChildren();

  if (!query) {
    status.textContent = `Ready — ${allVerses.length.toLocaleString()} verses indexed`;
    return;
  }

  const matches = searchVerses(allVerses, query);
  const visibleMatches = matches.slice(0, CONFIG.maximumResults);

  status.textContent = matches.length > CONFIG.maximumResults
    ? `${matches.length.toLocaleString()} hits — showing the first ${CONFIG.maximumResults}`
    : `${matches.length.toLocaleString()} ${matches.length === 1 ? "hit" : "hits"}`;

  if (!matches.length) {
    const empty = document.createElement("li");
    empty.className = "verse-search-empty";
    empty.textContent = "No matching verses.";
    resultsList.appendChild(empty);
    return;
  }

  for (const item of visibleMatches) {
    const row = document.createElement("li");
    row.className = "verse-search-result";

    const link = document.createElement("a");
    link.className = "internal-link verse-search-reference";
    link.dataset.href = `${item.path}#v${item.verse}`;
    link.href = `${item.path}#v${item.verse}`;
    link.textContent = `${item.book} ${item.chapter}:${item.verse}`;

    const verseText = document.createElement("span");
    appendVerseText(verseText, item.text, item.path);

    row.append(link, verseText);
    resultsList.appendChild(row);
  }
}

button.addEventListener("click", showResults);
input.addEventListener("keydown", event => {
  if (event.key === "Enter") showResults();
});

input.focus();
```

