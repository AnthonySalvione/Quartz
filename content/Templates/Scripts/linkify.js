// Templates/Scripts/linkify.js
module.exports = {
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

function stripOuterParens(s) {
  return s.replace(/^\(\s*/, "").replace(/\s*\)$/, "");
}

function stripTrailingPunct(s) {
  return s.replace(/[.:]\s*$/, "");
}

async function linkifyText(tp, inputText, opts = {}) {
  const bookMap = opts.bookMap ?? defaultBookMap();
  const defaultBook = opts.defaultBook ?? getDefaultBookFromTitle(tp);

  let text = String(inputText ?? "");
  if (!text.trim()) return text;

  let lastBook = null;
  let lastChapter = null;

  const implicitBook = () => lastBook ?? defaultBook;

  /**
   * IMPORTANT CHANGE:
   * - We run with "gm" so ^ works per-line.
   * - We use an explicit "prefix" capture for chap:verse with no book, so it matches:
   *   - at start of line
   *   - after whitespace
   *   - after punctuation like — -
   * and we reinsert that prefix so we don't delete characters.
   */
  const re = new RegExp(
    [
      // A) Book + chap:verse-range
      String.raw`(?<A_lp>\()?` +
        String.raw`\b(?<A_num>[1-3]\s)?(?<A_abbr>[A-Za-z]+\.?)\s+` +
        String.raw`(?<A_chap>\d+):(?<A_v1>\d+)(?<A_suf1>[a-z])?` +
        String.raw`(?:-(?<A_v2>\d+)(?<A_suf2>[a-z])?)?` +
        String.raw`(?<A_rp>\))?` +
        String.raw`(?<A_punct>[.:])?`,

      // P) ( chap:verse-range ) no book -> defaultBook
      String.raw`(?<P_paren>\(\s*)` +
        String.raw`(?<P_chap>\d+):(?<P_v1>\d+)(?<P_suf1>[a-z])?` +
        String.raw`(?:-(?<P_v2>\d+)(?<P_suf2>[a-z])?)?` +
        String.raw`(?<P_punct>[.:])?`,

      // B) ; chap:verse-range OR , chap:verse-range (same book)
      String.raw`(?<B_sep>[;,]\s*)` +
        String.raw`(?<B_chap>\d+):(?<B_v1>\d+)(?<B_suf1>[a-z])?` +
        String.raw`(?:-(?<B_v2>\d+)(?<B_suf2>[a-z])?)?` +
        String.raw`(?<B_punct>[.:])?`,

      // S) chap:verse-range with NO book (ROBUST)
      // prefix = start-of-line OR any non-word char (space, newline, dash, em dash, etc.)
      // Example matches: "6:1:" , "—16:17;" , "-5:1." , "\n15:1-2:"
      String.raw`(?<S_pre>^|[^\w])` +
        String.raw`(?<S_chap>\d+):(?<S_v1>\d+)(?<S_suf1>[a-z])?` +
        String.raw`(?:-(?<S_v2>\d+)(?<S_suf2>[a-z])?)?` +
        String.raw`(?<S_punct>[.:])?`,

      // C) , verse-only (optionally v./vv.) e.g., ", v. 3b-4a" or ", 8"
      String.raw`(?<C_sep>,\s*)` +
        String.raw`(?<C_vword>vv?\.?\s*)?` +
        String.raw`(?<C_v1>\d+)(?<C_suf1>[a-z])?` +
        String.raw`(?:-(?<C_v2>\d+)(?<C_suf2>[a-z])?)?` +
        String.raw`(?<C_punct>[.:])?`,

      // D) standalone v./vv. verse-only e.g., "v. 3." / "vv. 3-4."
      String.raw`\b(?<D_vword>vv?\.?\s*)` +
        String.raw`(?<D_v1>\d+)(?<D_suf1>[a-z])?` +
        String.raw`(?:-(?<D_v2>\d+)(?<D_suf2>[a-z])?)?` +
        String.raw`(?<D_punct>[.:])?`,

      // E) bare verse range like "12-13." (uses lastBook + lastChapter)
      // We keep it simple; once S works, context is correct.
      String.raw`\b(?<E_v1>\d+)(?<E_suf1>[a-z])?-(?<E_v2>\d+)(?<E_suf2>[a-z])?(?<E_punct>[.:])?`,
    ].join("|"),
    "gm"
  );

  return text.replace(re, (match, ...args) => {
    const groups = args.at(-1);
    if (!groups) return match;

    // A) Book chap:verse
    if (groups.A_abbr) {
      const book = canonicalBook(bookMap, groups.A_num, groups.A_abbr);
      if (!book) return match;

      lastBook = book;
      lastChapter = groups.A_chap;

      const punct = groups.A_punct ?? "";
      const display = stripTrailingPunct(stripOuterParens(match));
      const linked = makeLink(book, groups.A_chap, groups.A_v1, display);

      return `${groups.A_lp ? "(" : ""}${linked}${groups.A_rp ? ")" : ""}${punct}`;
    }

    // P) (chap:verse...)
    if (groups.P_paren) {
      if (!defaultBook) return match;

      lastBook = defaultBook;
      lastChapter = groups.P_chap;

      const punct = groups.P_punct ?? "";
      const display = stripTrailingPunct(stripOuterParens(match));
      const linked = makeLink(defaultBook, groups.P_chap, groups.P_v1, display);

      return `${groups.P_paren}${linked}${punct}`;
    }

    // B) ; chap:verse OR , chap:verse
    if (groups.B_sep) {
      const book = implicitBook();
      if (!book) return match;

      lastBook = book;
      lastChapter = groups.B_chap;

      const punct = groups.B_punct ?? "";
      const display = stripTrailingPunct(match.trim());
      const linked = makeLink(book, groups.B_chap, groups.B_v1, display);

      return `${groups.B_sep}${linked}${punct}`;
    }

    // S) chap:verse with no book (ROBUST)
    if (groups.S_chap) {
      const book = implicitBook();
      if (!book) return match;

      // Update context correctly (this is what fixes your B section)
      lastBook = book;
      lastChapter = groups.S_chap;

      const punct = groups.S_punct ?? "";
      const display = stripTrailingPunct(`${groups.S_chap}:${groups.S_v1}${groups.S_suf1 ?? ""}${
        groups.S_v2 ? `-${groups.S_v2}${groups.S_suf2 ?? ""}` : ""
      }`);

      const linked = makeLink(book, groups.S_chap, groups.S_v1, display);

      // Reinsert the prefix char (space/newline/dash/etc.)
      // If S_pre matched start-of-line (^), it's an empty string.
      return `${groups.S_pre ?? ""}${linked}${punct}`;
    }

    // C) , (v./vv.) verse-only
    if (groups.C_sep) {
      const book = implicitBook();
      if (!book || !lastChapter) return match;

      const punct = groups.C_punct ?? "";
      const vword = groups.C_vword ?? "";
      const displayCore = `${vword}${groups.C_v1}${groups.C_suf1 ?? ""}${
        groups.C_v2 ? `-${groups.C_v2}${groups.C_suf2 ?? ""}` : ""
      }`.trim();

      const linked = makeLink(book, lastChapter, groups.C_v1, displayCore);
      return `${groups.C_sep}${linked}${punct}`;
    }

    // D) standalone v./vv.
    if (groups.D_vword) {
      const book = implicitBook();
      if (!book || !lastChapter) return match;

      const punct = groups.D_punct ?? "";
      const displayCore = `${groups.D_vword}${groups.D_v1}${groups.D_suf1 ?? ""}${
        groups.D_v2 ? `-${groups.D_v2}${groups.D_suf2 ?? ""}` : ""
      }`.trim();

      const linked = makeLink(book, lastChapter, groups.D_v1, displayCore);
      return `${linked}${punct}`;
    }

    // E) bare verse range like 12-13
    if (groups.E_v1 && groups.E_v2) {
      const book = implicitBook();
      if (!book || !lastChapter) return match;

      const punct = groups.E_punct ?? "";
      const displayCore = `${groups.E_v1}${groups.E_suf1 ?? ""}-${groups.E_v2}${groups.E_suf2 ?? ""}`;

      const linked = makeLink(book, lastChapter, groups.E_v1, displayCore);
      return `${linked}${punct}`;
    }

    return match;
  });
}

async function linkifySelection(tp, opts = {}) {
  const sel = String(tp?.file?.selection?.() ?? "");
  if (!sel.trim()) return "";
  return await linkifyText(tp, sel, opts);
}

function defaultBookMap() {
  return {
    // OT (expanded)
    Gen: "Genesis", "Gen.": "Genesis", Genesis: "Genesis",
    Exo: "Exodus", "Exo.": "Exodus", Exodus: "Exodus",
    Lev: "Leviticus", "Lev.": "Leviticus", Leviticus: "Leviticus",
    Num: "Numbers", "Num.": "Numbers", Numbers: "Numbers",
    Deut: "Deuteronomy", "Deut.": "Deuteronomy", Deuteronomy: "Deuteronomy",

    Josh: "Joshua", "Josh.": "Joshua", Joshua: "Joshua",
    Judg: "Judges", "Judg.": "Judges", Judges: "Judges",
    Ruth: "Ruth",

    "1 Sam": "1 Samuel", "1 Sam.": "1 Samuel", "1 Samuel": "1 Samuel",
    "2 Sam": "2 Samuel", "2 Sam.": "2 Samuel", "2 Samuel": "2 Samuel",
    "1 Kings": "1 Kings", "1 Kings.": "1 Kings", "1 Kings": "1 Kings",
    "2 Kings": "2 Kings", "2 Kings.": "2 Kings", "2 Kings": "2 Kings",
    "1 Chron": "1 Chronicles", "1 Chron.": "1 Chronicles", "1 Chronicles": "1 Chronicles",
    "2 Chron": "2 Chronicles", "2 Chron.": "2 Chronicles", "2 Chronicles": "2 Chronicles",

    Ezra: "Ezra",
    Neh: "Nehemiah", "Neh.": "Nehemiah", Nehemiah: "Nehemiah",
    Esth: "Esther", "Esth.": "Esther", Esther: "Esther",

    Job: "Job",
    Psa: "Psalms", "Psa.": "Psalms", Psalm: "Psalms", Psalms: "Psalms",
    Prov: "Proverbs", "Prov.": "Proverbs", Proverbs: "Proverbs",
    Eccl: "Ecclesiastes", "Eccl.": "Ecclesiastes", Ecclesiastes: "Ecclesiastes",
    Song: "Song of Songs", "Song.": "Song of Songs",
    SS: "Song of Songs", "S.S.": "Song of Songs", "Song of Songs": "Song of Songs",

    Isa: "Isaiah", "Isa.": "Isaiah", Isaiah: "Isaiah",
    Jer: "Jeremiah", "Jer.": "Jeremiah", Jeremiah: "Jeremiah",
    Lam: "Lamentations", "Lam.": "Lamentations", Lamentations: "Lamentations",
    Ezek: "Ezekiel", "Ezek.": "Ezekiel", Ezekiel: "Ezekiel",
    Dan: "Daniel", "Dan.": "Daniel", Daniel: "Daniel",

    Hos: "Hosea", "Hos.": "Hosea", Hosea: "Hosea",
    Joel: "Joel",
    Amos: "Amos",
    Obad: "Obadiah", "Obad.": "Obadiah", Obadiah: "Obadiah",
    Jonah: "Jonah",
    Mic: "Micah", "Mic.": "Micah", Micah: "Micah",
    Nah: "Nahum", "Nah.": "Nahum", Nahum: "Nahum",
    Hab: "Habakkuk", "Hab.": "Habakkuk", Habakkuk: "Habakkuk",
    Zeph: "Zephaniah", "Zeph.": "Zephaniah", Zephaniah: "Zephaniah",
    Hag: "Haggai", "Hag.": "Haggai", Haggai: "Haggai",
    Zech: "Zechariah", "Zech.": "Zechariah", Zechariah: "Zechariah",
    Mal: "Malachi", "Mal.": "Malachi", Malachi: "Malachi",

    // NT
    Matt: "Matthew", "Matt.": "Matthew", Matthew: "Matthew",
    Mark: "Mark",
    Luke: "Luke",
    John: "John",
    Acts: "Acts",
    Rom: "Romans", "Rom.": "Romans", Romans: "Romans",
    "1 Cor": "1 Corinthians", "1 Cor.": "1 Corinthians", "1 Corinthians": "1 Corinthians",
    "2 Cor": "2 Corinthians", "2 Cor.": "2 Corinthians", "2 Corinthians": "2 Corinthians",
    Gal: "Galatians", "Gal.": "Galatians", Galatians: "Galatians",
    Eph: "Ephesians", "Eph.": "Ephesians", Ephesians: "Ephesians",
    Phil: "Philippians", "Phil.": "Philippians", Philippians: "Philippians",
    Col: "Colossians", "Col.": "Colossians", Colossians: "Colossians",
    "1 Thes": "1 Thessalonians", "1 Thes.": "1 Thessalonians", "1 Thessalonians": "1 Thessalonians",
    "2 Thes": "2 Thessalonians", "2 Thes.": "2 Thessalonians", "2 Thessalonians": "2 Thessalonians",
    "1 Tim": "1 Timothy", "1 Tim.": "1 Timothy", "1 Timothy": "1 Timothy",
    "2 Tim": "2 Timothy", "2 Tim.": "2 Timothy", "2 Timothy": "2 Timothy",
    Titus: "Titus",
    Philem: "Philemon", "Philem.": "Philemon", Philemon: "Philemon",
    Heb: "Hebrews", "Heb.": "Hebrews", Hebrews: "Hebrews",
    James: "James",
    "1 Pet": "1 Peter", "1 Pet.": "1 Peter", "1 Peter": "1 Peter",
    "2 Pet": "2 Peter", "2 Pet.": "2 Peter", "2 Peter": "2 Peter",
    "1 John": "1 John", "2 John": "2 John", "3 John": "3 John",
    Jude: "Jude",
    Rev: "Revelation", "Rev.": "Revelation", Revelation: "Revelation",
  };
}