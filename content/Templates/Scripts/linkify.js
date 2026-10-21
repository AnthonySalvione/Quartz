// Templates/Scripts/linkify.js — rerunnable Scripture linking and repair.
// Existing callers remain compatible: linkifyText(tp, text, { defaultBook }).
module.exports = {
  linkifyText,
  linkifySelection,
  linkifyDocument,
  linkifyWithReport
};

const VERSE_COUNTS = {
  "Genesis":[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
  "Exodus":[22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
  "Leviticus":[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
  "Numbers":[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
  "Deuteronomy":[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
  "Joshua":[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
  "Judges":[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
  "Ruth":[22,23,18,22],
  "1 Samuel":[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
  "2 Samuel":[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
  "1 Kings":[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
  "2 Kings":[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
  "1 Chronicles":[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
  "2 Chronicles":[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
  "Ezra":[11,70,13,24,17,22,28,36,15,44],
  "Nehemiah":[11,20,32,23,19,19,73,18,38,39,36,47,31],
  "Esther":[22,23,15,17,14,14,10,17,32,3],
  "Job":[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
  "Psalms":[6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
  "Proverbs":[33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
  "Ecclesiastes":[18,26,22,16,20,12,29,17,18,20,10,14],
  "Song of Songs":[17,17,11,16,16,13,13,14],
  "Isaiah":[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
  "Jeremiah":[19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
  "Lamentations":[22,22,66,22,22],
  "Ezekiel":[28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
  "Daniel":[21,49,30,37,31,28,28,27,27,21,45,13],
  "Hosea":[11,23,5,19,15,11,16,14,17,15,12,14,16,9],
  "Joel":[20,32,21],
  "Amos":[15,16,15,13,27,14,17,14,15],
  "Obadiah":[21],
  "Jonah":[17,10,10,11],
  "Micah":[16,13,12,13,15,16,20],
  "Nahum":[15,13,19],
  "Habakkuk":[17,20,19],
  "Zephaniah":[18,15,20],
  "Haggai":[15,23],
  "Zechariah":[21,13,10,14,11,15,14,23,17,12,17,14,9,21],
  "Malachi":[14,17,18,6],
  "Matthew":[25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  "Mark":[45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  "Luke":[80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  "John":[51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
  "Acts":[26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
  "Romans":[32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
  "1 Corinthians":[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
  "2 Corinthians":[24,17,18,18,21,18,16,24,15,18,33,21,14],
  "Galatians":[24,21,29,31,26,18],
  "Ephesians":[23,22,21,32,33,24],
  "Philippians":[30,30,21,23],
  "Colossians":[29,23,25,18],
  "1 Thessalonians":[10,20,13,18,28],
  "2 Thessalonians":[12,17,18],
  "1 Timothy":[20,15,16,16,25,21],
  "2 Timothy":[18,26,17,22],
  "Titus":[16,15,15],
  "Philemon":[25],
  "Hebrews":[14,18,19,16,14,20,28,13,28,39,40,29,25],
  "James":[27,26,18,17,20],
  "1 Peter":[25,25,22,19,14],
  "2 Peter":[21,22,18],
  "1 John":[10,29,24,21,21],
  "2 John":[13],
  "3 John":[14],
  "Jude":[25],
  "Revelation":[20,29,22,11,14,17,17,13,21,11,19,18,18,20,8,21,18,24,21,15,27,21]
};

const EXTRA_ALIASES = {
  Genesis: ['Gen', 'Ge'], Exodus: ['Exo', 'Ex'], Leviticus: ['Lev', 'Le'],
  Numbers: ['Num', 'Nu'], Deuteronomy: ['Deut', 'Deu', 'Dt'],
  Joshua: ['Josh', 'Jos'], Judges: ['Judg', 'Jdg'], Ruth: ['Rut'],
  '1 Samuel': ['1 Sam', '1 Sa', '1Sa'], '2 Samuel': ['2 Sam', '2 Sa', '2Sa'],
  '1 Kings': ['1 King', '1 Ki', '1Ki'], '2 Kings': ['2 King', '2 Ki', '2Ki'],
  '1 Chronicles': ['1 Chron', '1 Chr', '1 Ch', '1Ch'],
  '2 Chronicles': ['2 Chron', '2 Chr', '2 Ch', '2Ch'],
  Ezra: ['Ezr'], Nehemiah: ['Neh'], Esther: ['Esth', 'Est'],
  Psalms: ['Psalm', 'Psa', 'Ps'], Proverbs: ['Prov', 'Prv', 'Pr'],
  Ecclesiastes: ['Eccl', 'Ecc'],
  'Song of Songs': ['Song', 'SS', 'S.S.', 'SoS', 'Song of Solomon', 'S. S.'],
  Isaiah: ['Isa'], Jeremiah: ['Jer'], Lamentations: ['Lam'],
  Ezekiel: ['Ezek', 'Ezk'], Daniel: ['Dan'], Hosea: ['Hos'],
  Joel: ['Joe'], Amos: ['Amo'], Obadiah: ['Obad', 'Oba'],
  Jonah: ['Jon'], Micah: ['Mic'], Nahum: ['Nah'], Habakkuk: ['Hab'],
  Zephaniah: ['Zeph', 'Zep'], Haggai: ['Hag'],
  Zechariah: ['Zech', 'Zec'], Malachi: ['Mal'],
  Matthew: ['Matt', 'Mat', 'Mt'], Mark: ['Mrk', 'Mk'],
  Luke: ['Luk', 'Lk'], John: ['Joh', 'Jn'],
  Acts: ['Act'], Romans: ['Rom', 'Rm'],
  '1 Corinthians': ['1 Cor', '1 Co', '1Co'],
  '2 Corinthians': ['2 Cor', '2 Co', '2Co'],
  Galatians: ['Gal'], Ephesians: ['Eph'],
  Philippians: ['Phil', 'Phi'], Colossians: ['Col'],
  '1 Thessalonians': ['1 Thes', '1 Thess', '1 Th', '1Th'],
  '2 Thessalonians': ['2 Thes', '2 Thess', '2 Th', '2Th'],
  '1 Timothy': ['1 Tim', '1 Ti', '1Ti'],
  '2 Timothy': ['2 Tim', '2 Ti', '2Ti'],
  Titus: ['Tit'], Philemon: ['Philem', 'Phlm', 'Phm'],
  Hebrews: ['Heb'], James: ['Jam', 'Jas'],
  '1 Peter': ['1 Pet', '1 Pe', '1Pe'],
  '2 Peter': ['2 Pet', '2 Pe', '2Pe'],
  '1 John': ['1 Joh', '1 Jn', '1Jo'],
  '2 John': ['2 Joh', '2 Jn', '2Jo'],
  '3 John': ['3 Joh', '3 Jn', '3Jo'],
  Jude: ['Jud'], Revelation: ['Rev', 'Re']
};

const DASH = '[-–—−]';
const SP = '[ \\t\\u00a0\\r\\n]*';
const CV = `(\\d+)${SP}:${SP}(\\d+)([a-z]?)`;
const RANGE = `(?:(${SP}${DASH}${SP})(?:(\\d+)${SP}:${SP})?(\\d+)([a-z]?))?`;
const ORDINALS = ['First', 'Second', 'Third'];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keyOf = s => String(s ?? '').trim()
  .replace(
    /^(III|II|I)(?=\s+[A-Za-z])/i,
    prefix => String(['i', 'ii', 'iii'].indexOf(prefix.toLowerCase()) + 1)
  )
  .replace(/\./g, '')
  .replace(/\s+/g, '')
  .toLowerCase();

const REF_END = `(?![\\dA-Za-z]|[ \\t\\u00a0]*:[ \\t\\u00a0]*\\d|[ \\t\\u00a0]*${DASH}[ \\t\\u00a0]*\\d)`;
const pad2 = n => String(Number(n)).padStart(2, '0');

function configuration(tp, text, opts) {
  const aliases = new Map();

  for (const book of Object.keys(VERSE_COUNTS)) {
    for (const alias of [book, ...(EXTRA_ALIASES[book] ?? [])]) {
      aliases.set(keyOf(alias), book);
    }
  }

  for (const [alias, value] of Object.entries(opts.bookMap ?? {})) {
    const canonical = aliases.get(keyOf(value)) ?? value;
    aliases.set(keyOf(alias), canonical);
  }

  const aliasTexts = Object.keys(VERSE_COUNTS)
    .flatMap(b => [b, ...(EXTRA_ALIASES[b] ?? [])]);

  aliasTexts.push(...Object.keys(opts.bookMap ?? {}));

  for (const [alias, book] of [...aliases]) {
    const numbered = alias.match(/^([1-3])(.+)$/);

    if (numbered) {
      for (const prefix of [
        ORDINALS[Number(numbered[1]) - 1],
        ['I', 'II', 'III'][Number(numbered[1]) - 1]
      ]) {
        const key = keyOf(prefix + numbered[2]);
        if (!aliases.has(key)) aliases.set(key, book);
      }
    }
  }

  const patterns = new Set();

  for (const alias of aliasTexts) {
    let p = esc(alias)
      .replace(/\\\./g, '\\.?')
      .replace(/\s+/g, '[ \\t\\u00a0]*');

    if (!alias.endsWith('.')) p += '\\.?';
    patterns.add(p);

    const m = alias.match(/^([1-3])\s*(.+)$/);

    if (m) {
      const rest = esc(m[2])
        .replace(/\s+/g, '[ \\t\\u00a0]*')
        .replace(/\\\./g, '\\.?');

      patterns.add(
        `(?:${ORDINALS[Number(m[1]) - 1]}|${['I', 'II', 'III'][Number(m[1]) - 1]})[ \\t\\u00a0]+${rest}\\.?`
      );
    }
  }

  const bookPattern = [...patterns]
    .sort((a, b) => b.length - a.length)
    .join('|');

  const canonical = name => aliases.get(keyOf(name)) ?? null;
  const title = String(opts.title ?? tp?.file?.title ?? '');

  const fromTitle = title
    .replace(/\.(?:fn|xref)$/, '')
    .match(/^(.*)-(\d+)$/);

  let defaultBook =
    canonical(opts.defaultBook) ??
    (fromTitle && canonical(fromTitle[1]));

  if (!defaultBook) {
    const re = new RegExp(
      `(?:Life[ -]study of|book of)\\s+(${bookPattern})(?![A-Za-z])`,
      'i'
    );

    defaultBook = canonical((title.match(re) ?? text.match(re))?.[1]);
  }

  let defaultChapter = opts.defaultChapter == null
    ? null
    : Number(opts.defaultChapter);

  if (
    !defaultChapter &&
    fromTitle &&
    canonical(fromTitle[1]) === defaultBook
  ) {
    defaultChapter = Number(fromTitle[2]);
  }

  const application = opts.app ?? tp?.app ?? globalThis.app;
  const files = new Map();

  for (const f of application?.vault?.getMarkdownFiles?.() ?? []) {
    const base = f.basename ??
      String(f.path).split('/').at(-1).replace(/\.md$/, '');

    const m = base.match(/^(.*)-(\d+)$/);
    const book = m && canonical(m[1]);

    if (!book) continue;

    const id = `${book}:${Number(m[2])}`;

    if (!files.has(id)) files.set(id, []);
    files.get(id).push(f);
  }

  const sourceMode =
    opts.relativeContext === 'source' ||
    (opts.relativeContext !== 'citation' && !!defaultChapter);

  const regex = {
    explicit: new RegExp(
      `^(${bookPattern})(?![A-Za-z])${SP}${CV}${RANGE}${REF_END}`, 'i'
    ),
    bookNumber: new RegExp(
      `^(${bookPattern})(?![A-Za-z])${SP}(\\d+)([a-z]?)${RANGE}${REF_END}`, 'i'
    ),
    cv: new RegExp(`^${CV}${RANGE}${REF_END}`, 'i'),
    vv: new RegExp(
      `^(vv?\\.|verses?\\b)${SP}(\\d+)([a-z]?)${RANGE}${REF_END}`, 'i'
    ),
    verse: new RegExp(
      `^(\\d+)([a-z]?)${RANGE}${REF_END}`, 'i'
    ),
    bookInProse: new RegExp(
      `^(?:in|from|of|throughout|according to|the book of|the epistle to|the epistle of)[ \\t]+(${bookPattern})(?![A-Za-z])`,
      'i'
    ),
    bookBeforeChapter: new RegExp(
      `^(${bookPattern})(?![A-Za-z])(?=[ \\t]*\\([ \\t]*(?:chs?\\.|chapters?\\b))`,
      'i'
    )
  };

  return {
    aliases, canonical, defaultBook, defaultChapter,
    bookPattern, files, application, opts, sourceMode, regex
  };
}

function chapterNumber(s) {
  if (/^\d+$/.test(s)) return Number(s);

  const units = [
    'zero', 'one', 'two', 'three', 'four', 'five',
    'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
    'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen'
  ];

  const tens = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };

  let value = 0;

  for (const part of s.toLowerCase().split(/[ -]+/)) {
    if (part === 'and') continue;

    if (part === 'hundred' && value) value *= 100;
    else if (units.includes(part)) value += units.indexOf(part);
    else if (part in tens) value += tens[part];
    else return null;
  }

  return value || null;
}

function validRef(ref, env) {
  if (!ref?.book || !(ref.chapter > 0)) return false;
  if (env.opts.validate === false) return true;

  const chapters = VERSE_COUNTS[ref.book];

  if (!chapters || ref.chapter > chapters.length) return false;

  if (
    ref.verse != null &&
    (!(ref.verse > 0) || ref.verse > chapters[ref.chapter - 1])
  ) {
    return false;
  }

  if (
    ref.endChapter != null &&
    (ref.endChapter < ref.chapter || ref.endChapter > chapters.length)
  ) {
    return false;
  }

  if (ref.endVerse != null) {
    const endChapter = ref.endChapter ?? ref.chapter;

    if (
      endChapter > chapters.length ||
      !(ref.endVerse > 0) ||
      ref.endVerse > chapters[endChapter - 1]
    ) {
      return false;
    }

    if (
      endChapter < ref.chapter ||
      (endChapter === ref.chapter && ref.endVerse < ref.verse)
    ) {
      return false;
    }
  }

  return true;
}

function targetInfo(target, env) {
  let decoded;

  try {
    decoded = decodeURIComponent(target.replace(/^<|>$/g, ''));
  } catch {
    decoded = target;
  }

  if (/^[a-z]+:\/\//i.test(decoded)) return null;

  const m = decoded.match(
    /^(.*?)([^/]+)-(\d+)(?:\.md)?(?:#v(\d+)[a-z]?)?$/i
  );

  if (!m) return null;

  const book = env.canonical(m[2]);

  return book ? {
    book,
    chapter: Number(m[3]),
    verse: m[4] == null ? null : Number(m[4]),
    dir: m[1],
    original: decoded
  } : null;
}

function warning(report, code, index, reference, message) {
  report.warnings.push({ code, index, reference, message });
}

function makeTarget(ref, env, report, index, existing) {
  // Count filenames once per run across the entire vault.
  if (!env.basenameCounts) {
    env.basenameCounts = new Map();

    for (const f of env.application?.vault?.getMarkdownFiles?.() ?? []) {
      const base = f.basename ??
        String(f.path).split('/').at(-1).replace(/\.md$/i, '');

      const name = base.toLowerCase();

      env.basenameCounts.set(
        name,
        (env.basenameCounts.get(name) ?? 0) + 1
      );
    }
  }

  const choices = env.files.get(`${ref.book}:${ref.chapter}`) ?? [];

  const original = existing?.original
    ?.split('#')[0]
    .replace(/\.md$/i, '');

  const exact = choices.find(
    f => f.path.replace(/\.md$/i, '') === original
  );

  const byName =
    original &&
    !original.includes('/') &&
    env.basenameCounts.get(original.toLowerCase()) === 1
      ? choices.find(f => (
          f.basename ??
          String(f.path).split('/').at(-1).replace(/\.md$/i, '')
        ).toLowerCase() === original.toLowerCase())
      : null;

  const chosen = exact ?? byName ??
    (choices.length === 1 ? choices[0] : null);

  if (choices.length > 1 && !chosen) {
    warning(
      report, 'ambiguous-file', index,
      `${ref.book} ${ref.chapter}`,
      'Multiple chapter files match; no target was guessed.'
    );

    return null;
  }

  if (env.opts.requireExistingTargets && !chosen) {
    warning(
      report, 'missing-file', index,
      `${ref.book} ${ref.chapter}`,
      'No matching chapter file was found.'
    );

    return null;
  }

  let file;

  if (chosen) {
    const fullPath = chosen.path.replace(/\.md$/i, '');
    const basename = chosen.basename ?? fullPath.split('/').at(-1);

    file =
      env.opts.shortLinks !== false &&
      env.basenameCounts.get(basename.toLowerCase()) === 1
        ? basename
        : fullPath;
  } else {
    file = `${existing?.dir ?? ''}${ref.book}-${pad2(ref.chapter)}`;
  }

  if (
    chosen &&
    ref.verse != null &&
    env.opts.checkHeadings !== false
  ) {
    const cached = env.application?.metadataCache?.getFileCache?.(chosen);

    if (
      cached &&
      !cached.headings?.some(
        h => String(h.heading).trim() === `v${ref.verse}`
      )
    ) {
      warning(
        report, 'missing-heading', index,
        `${ref.book} ${ref.chapter}:${ref.verse}`,
        'The chapter exists but its cached verse heading was not found.'
      );

      if (env.opts.requireExistingTargets) return null;
    }
  }

  return `${file}${ref.verse == null ? '' : '#v' + ref.verse}`;
}

function render(ref, env, report, index, existing = null, style = 'wiki') {
  const first = makeTarget(ref, env, report, index, existing);
  if (!first) return null;

  const wrap = (target, label) => style.startsWith('markdown')
    ? `[${label}](${
        style === 'markdownAngle' || /\s/.test(target)
          ? '<' + target + '>'
          : target
      })`
    : `[[${target}|${label}]]`;

  if (
    ref.verse != null &&
    ref.endChapter != null &&
    ref.endChapter !== ref.chapter
  ) {
    const last = makeTarget(
      {
        book: ref.book,
        chapter: ref.endChapter,
        verse: ref.endVerse
      },
      env, report, index, existing
    );

    if (!last) return null;

    return wrap(first, ref.leftDisplay) +
      ref.dash +
      wrap(last, ref.rightDisplay);
  }

  return wrap(first, ref.display);
}

function connected(text, state, i) {
  if (!state.lastEnd && state.lastEnd !== 0) return false;

  const between = text.slice(state.lastEnd, i);

  return (
    /^[ \t\r\n]*(?:[,;]|and\b|or\b)[ \t\r\n]*(?:(?:cf\.|see)\s+)?$/i.test(between) &&
    !/\n\s*\n/.test(between)
  );
}

function readReference(text, i, env, state, existing = null) {
  const rest = text.slice(i);

  if (i && /[\w:]/.test(text[i - 1])) return null;

  if (
    /^\d{1,2}:\d{2}\s*(?:[ap]\.?m\.?\b|o[’']clock\b|hours?\b)/i.test(rest)
  ) {
    return null;
  }

  let m = rest.match(env.regex.explicit);
  let ref;

  if (m) {
    ref = {
      book: env.canonical(m[1]),
      chapter: Number(m[2]),
      verse: Number(m[3]),
      suffix: m[4],
      dash: m[5],
      endChapter: m[6] ? Number(m[6]) : null,
      endVerse: m[7] ? Number(m[7]) : null,
      endSuffix: m[8],
      explicit: true,
      length: m[0].length,
      display: m[0]
    };
  } else {
    m = rest.match(env.regex.bookNumber);

    if (m) {
      const book = env.canonical(m[1]);

      if (VERSE_COUNTS[book]?.length === 1) {
        ref = {
          book,
          chapter: 1,
          verse: Number(m[2]),
          suffix: m[3],
          dash: m[4],
          endChapter: m[5] ? Number(m[5]) : null,
          endVerse: m[6] ? Number(m[6]) : null,
          endSuffix: m[7],
          explicit: true,
          length: m[0].length,
          display: m[0]
        };
      } else if (
        env.opts.linkChapters !== false &&
        !m[3] && !m[5] && !m[7]
      ) {
        ref = {
          book,
          chapter: Number(m[2]),
          endChapter: m[6] ? Number(m[6]) : null,
          verse: null,
          explicit: true,
          length: m[0].length,
          display: m[0]
        };
      }
    }
  }

  if (!ref) {
    m = rest.match(env.regex.cv);

    if (m) {
      const isList = connected(text, state, i);
      const parenthetical = /\(\s*$/.test(text.slice(0, i));

      const book = isList
        ? state.book
        : (
            env.sourceMode
              ? state.relativeBook
              : (
                  state.book ??
                  (
                    existing
                      ? (
                          parenthetical && env.defaultBook
                            ? env.defaultBook
                            : existing.book
                        )
                      : env.defaultBook
                  )
                )
          );

      if (!book) return null;

      ref = {
        book,
        chapter: Number(m[1]),
        verse: Number(m[2]),
        suffix: m[3],
        dash: m[4],
        endChapter: m[5] ? Number(m[5]) : null,
        endVerse: m[6] ? Number(m[6]) : null,
        endSuffix: m[7],
        length: m[0].length,
        display: m[0]
      };
    }
  }

  if (!ref) {
    m = rest.match(env.regex.vv);

    if (m) {
      const useSource =
        env.sourceMode &&
        !connected(text, state, i) &&
        !state.citationScope;

      const book = useSource
        ? state.relativeBook
        : (state.book ?? existing?.book ?? env.defaultBook);

      const chapter = useSource
        ? state.relativeChapter
        : (state.chapter ?? existing?.chapter ?? env.defaultChapter);

      if (!book || !chapter) return null;

      ref = {
        book,
        chapter,
        verse: Number(m[2]),
        suffix: m[3],
        dash: m[4],
        endChapter: m[5] ? Number(m[5]) : null,
        endVerse: m[6] ? Number(m[6]) : null,
        endSuffix: m[7],
        length: m[0].length,
        display: m[0]
      };
    }
  }

  if (!ref && (connected(text, state, i) || existing)) {
    m = rest.match(env.regex.verse);

    const following = m && rest.slice(m[0].length);

    if (
      m &&
      (
        !/^\s+[A-Za-z]/.test(following) ||
        /^\s+(?:and|or)\s+\d/i.test(following) ||
        existing
      )
    ) {
      const isConnected = connected(text, state, i);
      const book = isConnected ? state.book : existing?.book;
      const chapter = isConnected ? state.chapter : existing?.chapter;

      const chapterList = isConnected
        ? state.lastKind === 'chapter'
        : existing?.verse === null;

      if (book && chapter) {
        if (chapterList && !m[2] && !m[4] && !m[6]) {
          ref = {
            book,
            chapter: Number(m[1]),
            verse: null,
            endChapter: m[5] ? Number(m[5]) : null,
            length: m[0].length,
            display: m[0]
          };
        } else if (!chapterList) {
          ref = {
            book,
            chapter,
            verse: Number(m[1]),
            suffix: m[2],
            dash: m[3],
            endChapter: m[4] ? Number(m[4]) : null,
            endVerse: m[5] ? Number(m[5]) : null,
            endSuffix: m[6],
            length: m[0].length,
            display: m[0]
          };
        }
      }
    }
  }

  if (!ref) return null;
  if (/\n\s*\n/.test(ref.display)) return null;

  if (
    ref.endChapter != null &&
    ref.endChapter !== ref.chapter
  ) {
    const sides = ref.display.split(
      new RegExp(`(${SP}${DASH}${SP})`)
    );

    ref.leftDisplay = sides[0];
    ref.dash = sides[1];
    ref.rightDisplay = sides.slice(2).join('');
  }

  return ref;
}

function wikiAt(text, i) {
  if (!text.startsWith('[[', i)) return null;

  let depth = 1;
  let j = i + 2;

  for (; j < text.length; j++) {
    if (text.startsWith('[[', j)) {
      depth++;
      j++;
    } else if (text.startsWith(']]', j)) {
      depth--;
      j++;

      if (!depth) break;
    }
  }

  if (depth) return null;

  const raw = text.slice(i, j + 1);
  const inner = raw.slice(2, -2);
  const pipe = inner.indexOf('|');

  return {
    raw,
    length: raw.length,
    target: pipe < 0 ? inner : inner.slice(0, pipe),
    alias: pipe < 0 ? null : inner.slice(pipe + 1),
    style: 'wiki'
  };
}

function visibleAlias(s) {
  return s.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, target, label) => label ?? target
  );
}

function repairLink(link, text, i, env, state, report) {
  const rangeTail = text.slice(i + link.length).match(
    new RegExp(
      `^${SP}${DASH}${SP}(?:\\d+${SP}:${SP})?\\d+[a-z]?${REF_END}`,
      'i'
    )
  )?.[0] ?? '';

  const old = targetInfo(link.target, env);
  if (!old) return { text: link.raw };

  if (
    env.opts.repairExistingLinks !== false &&
    link.alias &&
    /^\d{1,2}:\d{2}$/.test(link.alias) &&
    /^\s*(?:[ap]\.?m\.?|o[’']clock|hours?\b)/i.test(
      text.slice(i + link.length)
    )
  ) {
    report.repaired++;
    return { text: link.alias };
  }

  let ref = {
    ...old,
    display: link.alias ?? link.target,
    length: link.length
  };

  if (link.alias != null && env.opts.repairExistingLinks !== false) {
    const alias = visibleAlias(link.alias);
    const virtual = text.slice(0, i) + alias + rangeTail;

    const parsed = readReference(
      virtual, i, env, state, old
    );

    if (parsed && parsed.length === alias.length + rangeTail.length) {
      ref = parsed;
    } else if (parsed) {
      warning(
        report, 'complex-existing-alias', i, alias,
        'This alias contains extra text or several references; it was left unchanged.'
      );

      return { text: link.raw, context: old };
    } else if (/[:\d]/.test(alias)) {
      warning(
        report, 'ambiguous-existing-link', i, alias,
        'The displayed reference could not be interpreted reliably; its target was retained.'
      );

      return { text: link.raw, context: old };
    } else {
      return { text: link.raw, context: old };
    }
  }

  if (!validRef(ref, env)) {
    warning(
      report, 'invalid-reference', i,
      link.alias ?? link.target,
      'The book/chapter/verse or range is outside valid bounds; no repair was guessed.'
    );

    return { text: link.raw };
  }

  if (env.opts.repairExistingLinks === false) {
    return { text: link.raw, context: ref };
  }

  if (link.alias == null) {
    const target = makeTarget(ref, env, report, i, old);

    const output = target
      ? (link.style === 'wiki' ? `[[${target}]]` : link.raw)
      : link.raw;

    if (output !== link.raw) report.repaired++;

    return { text: output, context: ref };
  }

  const output =
    render(ref, env, report, i, old, link.style) ??
    link.raw;

  if (output !== link.raw) report.repaired++;

  return {
    text: output,
    context: ref,
    consumed: link.length + (
      ref.display === visibleAlias(link.alias ?? '') + rangeTail
        ? rangeTail.length
        : 0
    )
  };
}

function transform(tp, inputText, opts = {}) {
  const text = String(inputText ?? '');
  const env = configuration(tp, text, opts);
  const report = { linked: 0, repaired: 0, warnings: [] };

  const state = {
    book: env.defaultBook,
    chapter: env.defaultChapter,
    lastEnd: null,
    relativeBook: env.defaultBook,
    relativeChapter: env.defaultChapter,
    citationScope: false
  };

  const scopes = [];
  const outlineScopes = [];

  let out = '';
  let i = 0;

  function outlineContext() {
    return outlineScopes.at(-1);
  }

  function rememberOutline(ref) {
    if (env.sourceMode) return;

    for (const frame of outlineScopes) {
      if (frame.level < 2 && outlineScopes.length > 1) continue;

      frame.book = ref.book;
      frame.chapter = ref.endChapter ?? ref.chapter;
    }
  }

  function resetParagraph() {
    const frame = env.sourceMode ? null : outlineContext();

    state.book = frame?.book ?? env.defaultBook;
    state.chapter = frame?.chapter ?? env.defaultChapter;
    state.lastEnd = null;
    state.lastKind = null;
    state.relativeBook = env.defaultBook;
    state.relativeChapter = env.defaultChapter;
    state.citationScope = false;

    delete state.pendingBook;
  }

  function copy(length, reset = false) {
    out += text.slice(i, i + length);
    i += length;

    if (reset) {
      state.book = env.defaultBook;
      state.chapter = env.defaultChapter;
      state.lastEnd = null;
      state.relativeBook = env.defaultBook;
      state.relativeChapter = env.defaultChapter;
      state.citationScope = false;
      scopes.length = 0;
    }
  }

  const frontmatter = text.match(
    /^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/
  );

  if (frontmatter) copy(frontmatter[0].length, true);

  while (i < text.length) {
    const rest = text.slice(i);

    const paragraphBreak = rest.match(
      /^\r?\n[ \t]*(?:\r?\n)+/
    );

    if (paragraphBreak) {
      copy(paragraphBreak[0].length);
      resetParagraph();
      continue;
    }

    if (i === 0 || text[i - 1] === '\n') {
      const fence = rest.match(
        /^[ \t]{0,3}(`{3,}|~{3,})[^\n]*(?:\n|$)/
      );

      if (fence) {
        const endRe = new RegExp(
          `^[ \\t]{0,3}${fence[1][0]}{${fence[1].length},}[ \\t]*\\r?$`,
          'gm'
        );

        endRe.lastIndex = i + fence[0].length;
        const end = endRe.exec(text);

        copy(
          end
            ? end.index + end[0].length - i
            : text.length - i,
          true
        );

        continue;
      }

      if (
        /^[ \t]*#{1,6}[ \t]*(?:v\d+\b|Footnote\s+\d+\.\d+|Footnotes\s+for\s+verse\b)/i.test(rest)
      ) {
        const end = text.indexOf('\n', i);
        copy(end < 0 ? text.length - i : end - i);
        continue;
      }

      const heading = rest.match(
        /^[ \t]{0,3}(#{1,6})[ \t]+/
      );

      if (
        heading &&
        !env.sourceMode &&
        env.opts.outlineContext !== false
      ) {
        const level = heading[1].length;

        while (
          outlineScopes.length &&
          outlineScopes.at(-1).level >= level
        ) {
          outlineScopes.pop();
        }

        const parent = level > 2 ? outlineContext() : null;

        outlineScopes.push({
          level,
          book: parent?.book ?? env.defaultBook,
          chapter: parent?.chapter ?? env.defaultChapter
        });

        resetParagraph();
        copy(heading[0].length);
        continue;
      }
    }

    if (rest.startsWith('<!--') || rest.startsWith('%%')) {
      const close = rest.startsWith('<!--') ? '-->' : '%%';
      const end = text.indexOf(
        close,
        i + (close === '%%' ? 2 : 4)
      );

      copy(
        end < 0
          ? text.length - i
          : end + close.length - i
      );

      continue;
    }

    if (rest[0] === '`') {
      const ticks = rest.match(/^`+/)[0];
      const end = text.indexOf(ticks, i + ticks.length);

      if (end >= 0) {
        copy(end + ticks.length - i);
        continue;
      }
    }

    if (rest.startsWith('![')) {
      const embed = wikiAt(text, i + 1);

      const image = rest.match(
        /^!\[[^\]\n]*\]\((?:<[^>]*>|[^)\n]*)\)/
      );

      if (embed || image) {
        copy(embed ? embed.length + 1 : image[0].length);
        continue;
      }
    }

    const wiki = wikiAt(text, i);

    const md = rest.match(
      /^\[([^\]\n]*)\]\((<[^>]*>|[^)\n]*)\)/
    );

    const link = wiki ?? (
      md ? {
        raw: md[0],
        length: md[0].length,
        alias: md[1],
        target: md[2],
        style: md[2].startsWith('<')
          ? 'markdownAngle'
          : 'markdown'
      } : null
    );

    if (link) {
      const fixed = repairLink(
        link, text, i, env, state, report
      );

      out += fixed.text;
      i += fixed.consumed ?? link.length;

      if (fixed.context) {
        state.book = fixed.context.book;
        state.chapter =
          fixed.context.endChapter ?? fixed.context.chapter;
        state.lastEnd = i;

        rememberOutline(fixed.context);

        state.lastKind =
          fixed.context.verse == null ? 'chapter' : 'verse';

        if (
          !scopes.length &&
          fixed.context.verse == null &&
          fixed.context.book === env.defaultBook
        ) {
          state.relativeBook = fixed.context.book;
          state.relativeChapter = fixed.context.chapter;
        }

        if (
          scopes.length &&
          (fixed.context.explicit || !env.sourceMode)
        ) {
          state.citationScope = true;
        }
      }

      continue;
    }

    const url = rest.match(
      /^(?:https?:\/\/|obsidian:\/\/|<https?:\/\/)[^\s<>]+>?/i
    );

    if (url) {
      copy(url[0].length);
      continue;
    }

    const templater = rest.startsWith('<%')
      ? text.indexOf('%>', i + 2)
      : -1;

    if (templater >= 0) {
      copy(templater + 2 - i);
      continue;
    }

    if (rest[0] === '(') {
      scopes.push({ ...state });

      state.book = state.pendingBook ?? (
        env.sourceMode
          ? (state.relativeBook ?? state.book)
          : (state.book ?? state.relativeBook)
      );

      state.chapter = env.sourceMode
        ? (state.relativeChapter ?? state.chapter)
        : (state.chapter ?? state.relativeChapter);

      state.citationScope = !!state.pendingBook;
      state.lastEnd = null;

      delete state.pendingBook;
      copy(1);
      continue;
    }

    if (rest[0] === ')') {
      const saved = scopes.pop();

      const citation =
        !env.sourceMode && state.citationScope
          ? { book: state.book, chapter: state.chapter }
          : null;

      if (saved) {
        Object.assign(state, saved, citation);
        state.lastEnd = null;
        delete state.pendingBook;
      }

      copy(1);
      continue;
    }

    const bookHint = rest.match(env.regex.bookBeforeChapter);

    if (bookHint && (!i || !/\w/.test(text[i - 1]))) {
      state.pendingBook = env.canonical(bookHint[1]);
      copy(bookHint[0].length);
      continue;
    }

    const proseBook =
      !env.sourceMode && rest.match(env.regex.bookInProse);

    if (
      proseBook &&
      /^(?:[1-3]\s*)?[A-Z]/.test(proseBook[1]) &&
      !/^[ \t]*(?:\d|\([ \t]*(?:chs?\.|chapters?\b))/.test(
        rest.slice(proseBook[0].length)
      ) &&
      (!i || !/\w/.test(text[i - 1]))
    ) {
      const book = env.canonical(proseBook[1]);

      state.book = book;
      state.chapter = null;
      state.lastEnd = null;

      rememberOutline({ book, chapter: null });
      copy(proseBook[0].length);
      continue;
    }

    const hint = rest.match(
      /^(?:chapters?\b[ \t]+|(?:chap\.|chs?\.)[ \t]*)(\d+|(?:one hundred(?:[ -]and)?[ -])?(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[ -](?:one|two|three|four|five|six|seven|eight|nine))?|one hundred|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)(?:([ \t]*[-–—−][ \t]*)(\d+))?\b/i
    );

    if (hint && (!i || !/\w/.test(text[i - 1]))) {
      const chapter = chapterNumber(hint[1]);

      const book = state.citationScope
        ? state.book
        : (state.relativeBook ?? env.defaultBook);

      const chapterRef = {
        book,
        chapter,
        verse: null,
        endChapter: hint[3] ? Number(hint[3]) : null,
        display:
          `${book} ${chapter}` +
          `${hint[3] ? hint[2] + hint[3] : ''}`
      };

      if (book && validRef(chapterRef, env)) {
        const linked = env.opts.linkChapters === false
          ? null
          : render(chapterRef, env, report, i);

        if (linked) {
          out += linked;
          i += hint[0].length;
          report.linked++;
        } else {
          copy(hint[0].length);
        }

        state.book = book;
        state.chapter = chapter;
        state.lastEnd = linked ? i : null;
        state.lastKind = 'chapter';

        if (!scopes.length) {
          state.relativeBook = book;
          state.relativeChapter = chapter;
        }

        continue;
      }

      copy(hint[0].length);
      continue;
    }

    const ref = readReference(text, i, env, state);

    if (ref) {
      if (!validRef(ref, env)) {
        warning(
          report, 'invalid-reference', i, ref.display,
          'The reference or range is outside valid bounds.'
        );

        copy(ref.length);
        continue;
      }

      const rendered = render(ref, env, report, i);

      if (rendered) {
        out += rendered;
        report.linked++;
        i += ref.length;

        state.book = ref.book;
        state.chapter = ref.endChapter ?? ref.chapter;
        state.lastEnd = i;

        rememberOutline(ref);

        state.lastKind =
          ref.verse == null ? 'chapter' : 'verse';

        if (
          !scopes.length &&
          ref.verse == null &&
          ref.book === env.defaultBook
        ) {
          state.relativeBook = ref.book;
          state.relativeChapter = ref.chapter;
        }

        if (scopes.length && (ref.explicit || !env.sourceMode)) {
          state.citationScope = true;
        }
      } else {
        copy(ref.length);
      }

      continue;
    }

    copy(1);
  }

  return { text: out, report };
}

async function linkifyWithReport(tp, inputText, opts = {}) {
  return transform(tp, inputText, opts);
}

async function linkifyText(tp, inputText, opts = {}) {
  const result = transform(tp, inputText, opts);

  if (typeof opts.onReport === 'function') {
    opts.onReport(result.report);
  }

  return result.text;
}

async function linkifySelection(tp, opts = {}) {
  const selected = String(tp?.file?.selection?.() ?? '');

  return selected.trim()
    ? linkifyText(tp, selected, opts)
    : '';
}

async function linkifyDocument(tp, opts = {}) {
  const application = opts.app ?? tp?.app ?? globalThis.app;

  const file =
    opts.file ??
    tp?.config?.target_file ??
    application?.workspace?.getActiveFile?.();

  if (
    !application?.vault?.process ||
    !file ||
    file.extension !== 'md'
  ) {
    throw new Error('Linkify needs an active Markdown note.');
  }

  let result;

  const title = file.basename ?? file.name.replace(/\.md$/, '');

  await application.vault.process(file, data => {
    result = transform(tp, data, { ...opts, title });
    return result.text;
  });

  if (typeof opts.onReport === 'function') {
    opts.onReport(result.report);
  }

  return result.report;
}