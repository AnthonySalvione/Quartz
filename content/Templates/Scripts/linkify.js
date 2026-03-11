// Templates/Scripts/linkify.js
module.exports = {
  // --- Public API ---
  linkifySelection,
  linkifyText,
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getDefaultBookFromTitle(tp) {
  const title = String(tp?.file?.title ?? "");
  return title.includes("-") ? title.split("-")[0] : null;
}

function canonicalBook(bookMap, numPart, abbr) {
  const base = abbr.trim();
  const key = numPart ? `${numPart.trim()} ${base}` : base;
  return bookMap[key] ?? bookMap[base] ?? null;
}

function makeLink(book, chapStr, verseNumStr, displayText) {
  const file = `${book}-${pad2(chapStr)}`;
  const target = `${file}#v${verseNumStr}`;
  return `[[${target}|${displayText}]]`;
}

// ---- Core linkify (text in, text out) ----
async function linkifyText(tp, inputText, opts = {}) {
  const bookMap = opts.bookMap ?? defaultBookMap();
  const defaultBook = opts.defaultBook ?? getDefaultBookFromTitle(tp);

  let text = String(inputText ?? "");
  if (!text.trim()) return text;

  let lastBook = null;
  let lastChapter = null;

  // A) (optional "(") Book chap:verse...
  // P) ( chap:verse... ) starts paren with no book -> defaultBook
  // B) ; chap:verse... OR , chap:verse...
  // C) , verse-only...
  const re = new RegExp(
    "(\\()?\\b([1-3]\\s)?([A-Za-z]+\\.?)(?:\\s+)(\\d+):(\\d+)([a-z])?(?:-(\\d+)([a-z])?)?\\b(\\))?"
    + "|(\\(\\s*)(\\d+):(\\d+)([a-z])?(?:-(\\d+)([a-z])?)?\\b"
    + "|([;,]\\s*)(\\d+):(\\d+)([a-z])?(?:-(\\d+)([a-z])?)?\\b"
    + "|(,\\s*)(\\d+)([a-z])?(?:-(\\d+)([a-z])?)?\\b",
    "g"
  );

  return text.replace(re, (...args) => {
    const match = args[0];

    // A
    const lp    = args[1];
    const numA  = args[2];
    const abbrA = args[3];
    const chapA = args[4];
    const vA    = args[5];
    const rp    = args[9];

    // P
    const parenP = args[10];
    const chapP  = args[11];
    const vP     = args[12];
    const sufP   = args[13];
    const vP2    = args[14];
    const sufP2  = args[15];

    // B
    const sepB  = args[16];
    const chapB = args[17];
    const vB    = args[18];
    const sufB  = args[19];
    const vB2   = args[20];
    const sufB2 = args[21];

    // C
    const sepC  = args[22];
    const vC    = args[23];
    const sufC  = args[24];
    const vC2   = args[25];
    const sufC2 = args[26];

    // A) Book + chap:verse
    if (abbrA) {
      const book = canonicalBook(bookMap, numA, abbrA);
      if (!book) return match;

      lastBook = book;
      lastChapter = chapA;

      const display = match.replace(/^\(/, "").replace(/\)$/, "");
      const linked = makeLink(book, chapA, vA, display);

      return `${lp ? "(" : ""}${linked}${rp ? ")" : ""}`;
    }

    // P) (chap:verse ...) no book -> use default book of current file
    if (parenP) {
      if (!defaultBook) return match;

      lastBook = defaultBook;
      lastChapter = chapP;

      const display = `${chapP}:${vP}${sufP ?? ""}${vP2 ? `-${vP2}${sufP2 ?? ""}` : ""}`;
      return `${parenP}${makeLink(defaultBook, chapP, vP, display)}`;
    }

    // B) ; chap:verse (same book)
    if (sepB) {
      if (!lastBook) return match;

      lastChapter = chapB;
      const display = `${chapB}:${vB}${sufB ?? ""}${vB2 ? `-${vB2}${sufB2 ?? ""}` : ""}`;
      return `${sepB}${makeLink(lastBook, chapB, vB, display)}`;
    }

    // C) , verse-only (same book + chapter)
    if (sepC) {
      if (!lastBook || !lastChapter) return match;

      const display = `${vC}${sufC ?? ""}${vC2 ? `-${vC2}${sufC2 ?? ""}` : ""}`;
      return `${sepC}${makeLink(lastBook, lastChapter, vC, display)}`;
    }

    return match;
  });
}

// ---- Convenience: run on selection (so you can call it as a standalone template) ----
async function linkifySelection(tp, opts = {}) {
  const sel = String(tp?.file?.selection?.() ?? "");
  if (!sel.trim()) return "";
  return await linkifyText(tp, sel, opts);
}

// ---- Book map (put ALL abbreviations here once) ----
function defaultBookMap() {
  return {
    // OT (expanded)
    "Gen": "Genesis", "Gen.": "Genesis", "Genesis": "Genesis",
    "Exo": "Exodus", "Exo.": "Exodus", "Exodus": "Exodus",
    "Lev": "Leviticus", "Lev.": "Leviticus", "Leviticus": "Leviticus",
    "Num": "Numbers", "Num.": "Numbers", "Numbers": "Numbers",
    "Deut": "Deuteronomy", "Deut.": "Deuteronomy", "Deuteronomy": "Deuteronomy",

    "Josh": "Joshua", "Josh.": "Joshua", "Joshua": "Joshua",
    "Judg": "Judges", "Judg.": "Judges", "Judges": "Judges",
    "Ruth": "Ruth",

    "1 Sam": "1 Samuel", "1 Sam.": "1 Samuel", "1 Samuel": "1 Samuel",
    "2 Sam": "2 Samuel", "2 Sam.": "2 Samuel", "2 Samuel": "2 Samuel",
    "1 Kings": "1 Kings", "1 Kings.": "1 Kings", "1 Kings": "1 Kings",
    "2 Kings": "2 Kings", "2 Kings.": "2 Kings", "2 Kings": "2 Kings",
    "1 Chron": "1 Chronicles", "1 Chron.": "1 Chronicles", "1 Chronicles": "1 Chronicles",
    "2 Chron": "2 Chronicles", "2 Chron.": "2 Chronicles", "2 Chronicles": "2 Chronicles",

    "Ezra": "Ezra",
    "Neh": "Nehemiah", "Neh.": "Nehemiah", "Nehemiah": "Nehemiah",
    "Esth": "Esther", "Esth.": "Esther", "Esther": "Esther",

    "Job": "Job",
    "Psa": "Psalms", "Psa.": "Psalms", "Psalm": "Psalms", "Psalms": "Psalms",
    "Prov": "Proverbs", "Prov.": "Proverbs", "Proverbs": "Proverbs",
    "Eccl": "Ecclesiastes", "Eccl.": "Ecclesiastes", "Ecclesiastes": "Ecclesiastes",
    "Song": "Song of Songs", "Song.": "Song of Songs",
    "SS": "Song of Songs", "S.S.": "Song of Songs", "Song of Songs": "Song of Songs",

    "Isa": "Isaiah", "Isa.": "Isaiah", "Isaiah": "Isaiah",
    "Jer": "Jeremiah", "Jer.": "Jeremiah", "Jeremiah": "Jeremiah",
    "Lam": "Lamentations", "Lam.": "Lamentations", "Lamentations": "Lamentations",
    "Ezek": "Ezekiel", "Ezek.": "Ezekiel", "Ezekiel": "Ezekiel",
    "Dan": "Daniel", "Dan.": "Daniel", "Daniel": "Daniel",

    "Hos": "Hosea", "Hos.": "Hosea", "Hosea": "Hosea",
    "Joel": "Joel",
    "Amos": "Amos",
    "Obad": "Obadiah", "Obad.": "Obadiah", "Obadiah": "Obadiah",
    "Jonah": "Jonah",
    "Mic": "Micah", "Mic.": "Micah", "Micah": "Micah",
    "Nah": "Nahum", "Nah.": "Nahum", "Nahum": "Nahum",
    "Hab": "Habakkuk", "Hab.": "Habakkuk", "Habakkuk": "Habakkuk",
    "Zeph": "Zephaniah", "Zeph.": "Zephaniah", "Zephaniah": "Zephaniah",
    "Hag": "Haggai", "Hag.": "Haggai", "Haggai": "Haggai",
    "Zech": "Zechariah", "Zech.": "Zechariah", "Zechariah": "Zechariah",
    "Mal": "Malachi", "Mal.": "Malachi", "Malachi": "Malachi",

    // NT
    "Matt": "Matthew", "Matt.": "Matthew", "Matthew": "Matthew",
    "Mark": "Mark",
    "Luke": "Luke",
    "John": "John",
    "Acts": "Acts",
    "Rom": "Romans", "Rom.": "Romans", "Romans": "Romans",
    "1 Cor": "1 Corinthians", "1 Cor.": "1 Corinthians", "1 Corinthians": "1 Corinthians",
    "2 Cor": "2 Corinthians", "2 Cor.": "2 Corinthians", "2 Corinthians": "2 Corinthians",
    "Gal": "Galatians", "Gal.": "Galatians", "Galatians": "Galatians",
    "Eph": "Ephesians", "Eph.": "Ephesians", "Ephesians": "Ephesians",
    "Phil": "Philippians", "Phil.": "Philippians", "Philippians": "Philippians",
    "Col": "Colossians", "Col.": "Colossians", "Colossians": "Colossians",
    "1 Thes": "1 Thessalonians", "1 Thes.": "1 Thessalonians", "1 Thessalonians": "1 Thessalonians",
    "2 Thes": "2 Thessalonians", "2 Thes.": "2 Thessalonians", "2 Thessalonians": "2 Thessalonians",
    "1 Tim": "1 Timothy", "1 Tim.": "1 Timothy", "1 Timothy": "1 Timothy",
    "2 Tim": "2 Timothy", "2 Tim.": "2 Timothy", "2 Timothy": "2 Timothy",
    "Titus": "Titus",
    "Philem": "Philemon", "Philem.": "Philemon", "Philemon": "Philemon",
    "Heb": "Hebrews", "Heb.": "Hebrews", "Hebrews": "Hebrews",
    "James": "James",
    "1 Pet": "1 Peter", "1 Pet.": "1 Peter", "1 Peter": "1 Peter",
    "2 Pet": "2 Peter", "2 Pet.": "2 Peter", "2 Peter": "2 Peter",
    "1 John": "1 John", "2 John": "2 John", "3 John": "3 John",
    "Jude": "Jude",
    "Rev": "Revelation", "Rev.": "Revelation", "Revelation": "Revelation",
  };
}
