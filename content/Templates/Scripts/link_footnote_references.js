/*
 * Recovery Version footnote reference linker.
 * Save as link_footnote_references_v3.js in Templater's script folder.
 *
 * Separate Markdown template:
 * <%* tR += await tp.user.link_footnote_references_v3(tp); %>
 *
 * Reads source context from filename, Chapter metadata, or Verse metadata.
 * Uses short filenames when unique; otherwise retains full paths.
 * Destination files must end in .fn.md.
 * Only the current document is edited.
 */
'use strict';

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const superscript = n => String(n).replace(/\d/g, d => SUP[Number(d)]);
const unsup = s => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, d => String(SUP.indexOf(d)));
const normal = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const BOOKS = [
  ['Genesis', 'Gen'], ['Exodus', 'Exo', 'Exod'], ['Leviticus', 'Lev'],
  ['Numbers', 'Num'], ['Deuteronomy', 'Deut'], ['Joshua', 'Josh'],
  ['Judges', 'Judg'], ['Ruth'], ['1 Samuel', '1 Sam'], ['2 Samuel', '2 Sam'],
  ['1 Kings', '1 Kgs'], ['2 Kings', '2 Kgs'], ['1 Chronicles', '1 Chron', '1 Chr'],
  ['2 Chronicles', '2 Chron', '2 Chr'], ['Ezra'], ['Nehemiah', 'Neh'], ['Esther', 'Esth'],
  ['Job'], ['Psalms', 'Psalm', 'Psa', 'Ps'], ['Proverbs', 'Prov'], ['Ecclesiastes', 'Eccl'],
  ['Song of Songs', 'S.S.', 'Song'], ['Isaiah', 'Isa'], ['Jeremiah', 'Jer'],
  ['Lamentations', 'Lam'], ['Ezekiel', 'Ezek'], ['Daniel', 'Dan'], ['Hosea', 'Hose', 'Hos'],
  ['Joel'], ['Amos'], ['Obadiah', 'Obad'], ['Jonah'], ['Micah', 'Mic'], ['Nahum', 'Nah'],
  ['Habakkuk', 'Hab'], ['Zephaniah', 'Zeph'], ['Haggai', 'Hag'], ['Zechariah', 'Zech'],
  ['Malachi', 'Mal'], ['Matthew', 'Matt', 'Mt'], ['Mark', 'Mk'], ['Luke', 'Lk'], ['John', 'Jn'],
  ['Acts'], ['Romans', 'Rom'], ['1 Corinthians', '1 Cor'], ['2 Corinthians', '2 Cor'],
  ['Galatians', 'Gal'], ['Ephesians', 'Eph'], ['Philippians', 'Phil'], ['Colossians', 'Col'],
  ['1 Thessalonians', '1 Thes', '1 Thess'], ['2 Thessalonians', '2 Thes', '2 Thess'],
  ['1 Timothy', '1 Tim'], ['2 Timothy', '2 Tim'], ['Titus'], ['Philemon', 'Philem', 'Phlm'],
  ['Hebrews', 'Heb'], ['James', 'Jas'], ['1 Peter', '1 Pet'], ['2 Peter', '2 Pet'],
  ['1 John', '1 Jn'], ['2 John', '2 Jn'], ['3 John', '3 Jn'], ['Jude'],
  ['Revelation', 'Rev']
];

const ALIASES = new Map(
  BOOKS.flatMap(names => names.map(n => [normal(n), names[0]]))
);

const key = c => `${normal(c.book)}:${Number(c.chapter)}`;

function chapterFromPath(path) {
  try {
    path = decodeURIComponent(path);
  } catch (_) {}

  const name = path.split('#')[0].split('/').pop()
    .replace(/\.md$/i, '')
    .replace(/\.fn$/i, '');

  const m = name.match(/^(.+)-(\d{1,3})$/);

  if (!m || !ALIASES.has(normal(m[1]))) return null;

  return {
    book: ALIASES.get(normal(m[1])),
    chapter: Number(m[2]),
    path: path.split('#')[0].replace(/\.md$/i, '')
  };
}

function readLink(text, pos) {
  const part = text.slice(pos);
  let m = part.match(/^\[\[([^\]\n]+)\]\]/);

  if (m) {
    const [target, label] = m[1].split('|');

    return {
      end: pos + m[0].length,
      target,
      label: label || target,
      raw: m[0]
    };
  }

  m = part.match(/^\[([^\]\n]*)\]\(\s*<([^>\n]+)>\s*\)/) ||
      part.match(/^\[([^\]\n]*)\]\(([^()\s]+)\)/);

  return m ? {
    end: pos + m[0].length,
    label: m[1],
    target: m[2],
    raw: m[0]
  } : null;
}

function masked(text) {
  return text
    .replace(
      /^---\r?\n[\s\S]*?\r?\n---[^\n]*(?:\n|$)/,
      m => m.replace(/[^\r\n]/g, ' ')
    )
    .replace(
      /^( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[^\n]*(?:\n|$)/gm,
      m => m.replace(/[^\r\n]/g, ' ')
    )
    .replace(
      /<!--[^]*?-->|%%[^]*?%%|(`+)[^]*?\1/g,
      m => m.replace(/[^\r\n]/g, ' ')
    );
}

function indexFiles(files, vaultPaths = files.map(file => file.path)) {
  const chapters = new Map();
  const basenameCounts = new Map();

  for (const path of vaultPaths) {
    const name = path.split('/').pop()
      .replace(/\.md$/i, '')
      .toLowerCase();

    basenameCounts.set(
      name,
      (basenameCounts.get(name) || 0) + 1
    );
  }

  for (const file of files) {
    if (!/\.fn\.md$/i.test(file.path)) continue;

    const context = chapterFromPath(file.path);
    if (!context) continue;

    const headings = new Map();

    for (const match of masked(file.text).matchAll(
      /^#{1,6}\s+(Footnote\s+(\d+)\.(\d+)\b[^\r\n]*)/gmi
    )) {
      const id = `${Number(match[2])}.${Number(match[3])}`;
      const heading = match[1].replace(/\s+#+\s*$/, '').trim();

      if (!headings.has(id)) headings.set(id, []);
      headings.get(id).push(heading);
    }

    if (!chapters.has(key(context))) {
      chapters.set(key(context), []);
    }

    const path = file.path.replace(/\.md$/i, '');
    const basename = path.split('/').pop();

    chapters.get(key(context)).push({
      path,
      headings,
      linkPath: basenameCounts.get(basename.toLowerCase()) === 1
        ? basename
        : path
    });
  }

  return chapters;
}

function readAtom(text, pos) {
  const start = pos;
  const link = readLink(text, pos);

  if (link) {
    if (/\.fn(?:\.md)?#Footnote\s+\d+\.\d+/i.test(link.target)) {
      return {
        start,
        end: link.end,
        existing: true,
        raw: link.raw
      };
    }

    const sup = text.slice(link.end).match(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/);

    if (
      /^\d+$/.test(link.label) &&
      sup &&
      chapterFromPath(link.target)
    ) {
      return {
        start,
        end: link.end + sup[0].length,
        verse: Number(link.label),
        note: Number(unsup(sup[0])),
        raw: text.slice(start, link.end + sup[0].length)
      };
    }

    return null;
  }

  const m = text.slice(pos).match(
    /^(\d{1,4})(?:([⁰¹²³⁴⁵⁶⁷⁸⁹]+)|\.(\d{1,2})|\^(\d{1,2})|<sup>(\d{1,2})<\/sup>)?/i
  );

  if (!m) return null;

  pos += m[0].length;

  const atom = {
    start,
    end: pos,
    raw: m[0],
    digits: m[1]
  };

  if (m[2] || m[3] || m[4] || m[5]) {
    atom.verse = Number(m[1]);
    atom.note = Number(
      m[2] ? unsup(m[2]) : m[3] || m[4] || m[5]
    );
  }

  if (
    /^[⁰¹²³⁴⁵⁶⁷⁸⁹\d^]|^\s*[-–—]\s*\d|^\s*\.(?=\d)/.test(
      text.slice(pos)
    )
  ) {
    atom.unsupported = true;
  }

  return atom;
}

function readContext(text, pos, current) {
  const space = text.slice(pos).match(/^\s+/);
  if (space) pos += space[0].length;

  const qualifier = text.slice(pos).match(
    /^,?\s*pars?\.?\s*\d+(?:\s*[-–]\s*\d+)?\s*,?\s*/i
  );

  if (qualifier) pos += qualifier[0].length;

  const intro = text.slice(pos).match(/^in\s+/i);
  if (!intro) return null;

  pos += intro[0].length;

  const link = readLink(text, pos);

  if (link) {
    const context = chapterFromPath(link.target);

    return {
      end: link.end,
      context,
      invalid: !context
    };
  }

  let m = text.slice(pos).match(/^(?:this|the same)\s+chapter\b/i);

  if (m) {
    return {
      end: pos + m[0].length,
      context: current
    };
  }

  m = text.slice(pos).match(/^(?:ch(?:apter)?\.?\s*)(\d{1,3})\b/i);

  if (m) {
    return {
      end: pos + m[0].length,
      context: current && {
        book: current.book,
        chapter: Number(m[1])
      }
    };
  }

  m = text.slice(pos).match(
    /^((?:[1-3]\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)*\.?)\s+(\d{1,3})\b/
  );

  if (m && ALIASES.has(normal(m[1]))) {
    return {
      end: pos + m[0].length,
      context: {
        book: ALIASES.get(normal(m[1])),
        chapter: Number(m[2])
      }
    };
  }

  return {
    end: pos,
    context: null,
    invalid: true
  };
}

function parseChain(text, pos, current) {
  const atoms = [];
  let cursor = pos;
  let unsupported = false;

  for (let guard = 0; guard < 50; guard++) {
    const atom = readAtom(text, cursor);
    if (!atom) break;

    atoms.push(atom);

    if (atom.unsupported) {
      unsupported = true;
      break;
    }

    cursor = atom.end;

    const ctx = readContext(text, cursor, current);

    if (ctx) {
      atom.explicit = true;
      atom.context = ctx.context;
      cursor = ctx.end;
    }

    const separator = text.slice(cursor).match(
      /^(?:\s*[,;]\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+)(?:notes?\s+)?/i
    );

    if (!separator) break;

    const next = cursor + separator[0].length;
    if (!readAtom(text, next)) break;

    cursor = next;
  }

  let nextContext;

  for (let i = atoms.length - 1; i >= 0; i--) {
    if (atoms[i].explicit) {
      nextContext = atoms[i].context;
    } else if (nextContext !== undefined) {
      atoms[i].context = nextContext;
    }
  }

  let previousContext = current;

  for (const atom of atoms) {
    if (atom.context !== undefined) {
      previousContext = atom.context;
    } else {
      atom.context = previousContext;
    }
  }

  return {
    atoms,
    end: cursor,
    unsupported
  };
}

function resolveAtom(atom, context, index, options = {}) {
  if (!context) {
    return {
      reason: 'Could not determine the destination chapter.'
    };
  }

  let files = index.get(key(context)) || [];

  if (context.path) {
    const exact = files.filter(
      f => f.path === context.path.replace(/\.fn$/i, '') + '.fn'
    );

    if (exact.length) {
      files = exact;
    } else if (context.path.includes('/')) {
      return {
        reason: 'No .fn.md file alongside the linked chapter.'
      };
    }
  }

  if (!files.length) {
    return {
      reason: `Missing footnote file for ${context.book} ${context.chapter}.`
    };
  }

  if (files.length !== 1) {
    return {
      reason: `Multiple footnote files for ${context.book} ${context.chapter}. Use a full chapter link.`
    };
  }

  const file = files[0];
  const candidates = [];

  if (atom.implicitNote && context.verse) {
    for (const id of file.headings.keys()) {
      const [v, n] = id.split('.').map(Number);

      if (v === context.verse) {
        candidates.push([v, n]);
      }
    }
  } else if (atom.verse !== undefined) {
    candidates.push([atom.verse, atom.note]);
  } else if (context.inferredVerse && context.verse) {
    atom.shorthand = true;
    candidates.push([context.verse, Number(atom.digits)]);
  } else if (atom.digits.length === 1 && context.verse) {
    candidates.push([context.verse, Number(atom.digits)]);
  } else {
    for (let split = 1; split < atom.digits.length; split++) {
      const left = atom.digits.slice(0, split);
      const right = atom.digits.slice(split);

      if (left[0] !== '0' && right[0] !== '0') {
        candidates.push([Number(left), Number(right)]);
      }
    }
  }

  const found = candidates.filter(
    ([v, n]) => v > 0 && n > 0 && file.headings.has(`${v}.${n}`)
  );

  if (!found.length) {
    return {
      reason: `No matching footnote heading in ${file.path}.`
    };
  }

  if (found.length > 1) {
    return {
      reason: atom.implicitNote
        ? 'More than one footnote belongs to the preceding verse. Specify the note number.'
        : `Ambiguous flattened number: ${
            found.map(([v, n]) => `${v}${superscript(n)}`).join(' or ')
          }. Add a superscript.`
    };
  }

  const [verse, note] = found[0];
  const headings = file.headings.get(`${verse}.${note}`);

  if (headings.length !== 1) {
    return {
      reason: `Duplicate heading for Footnote ${verse}.${note}.`
    };
  }

  const linkPath = options.shortLinks === false
    ? file.path
    : file.linkPath;

  return {
    verse,
    note,
    target: `${linkPath}#${headings[0]}`
  };
}

function precedingVerseContext(text, start, links) {
  let preceding;

  for (const item of links) {
    if (item[1] > start) break;
    preceding = item;
  }

  if (!preceding) return null;

  const between = text.slice(preceding[1], start);

  if (
    /\r?\n\s*\r?\n/.test(between) ||
    !/^\s*,?\s*(?:and|see)\s*$/i.test(between)
  ) {
    return null;
  }

  const link = preceding[2];
  const verse = link.target.match(/#v(\d+)$/i);

  if (!verse || /\.fn(?:\.md)?#/i.test(link.target)) {
    return null;
  }

  const chapter = chapterFromPath(link.target);

  if (!chapter || /\d\s*[-–—]\s*\d/.test(link.label)) {
    return { context: null };
  }

  return {
    context: {
      ...chapter,
      verse: Number(verse[1]),
      inferredVerse: true
    }
  };
}

function transform(text, sourcePath, index, options = {}) {
  const scan = masked(text);
  let current = chapterFromPath(sourcePath);

  if (!current) {
    const chapterLine = text.match(/^\*\*Chapter:\*\*\s*(.+)$/m);
    const chapterLink = chapterLine && readLink(chapterLine[1], 0);

    if (chapterLink) {
      current = chapterFromPath(chapterLink.target);
    }
  }

  const protectedLinks = [];

  for (let i = 0; i < scan.length; i++) {
    if (scan[i] !== '[') continue;

    const link = readLink(scan, i);

    if (link) {
      protectedLinks.push([i, link.end, link]);
      i = link.end - 1;
    }
  }

  const edits = [];
  const skipped = [];

  // Repair incorrect existing links using adjacent verse context.
  for (const [start, end, link] of protectedLinks) {
    if (!/\.fn(?:\.md)?#Footnote\s+\d+\.\d+/i.test(link.target)) {
      continue;
    }

    const label = link.label.match(/^(note)\s+(.+)$/i);
    if (!label) continue;

    const preceding = precedingVerseContext(
      scan, start, protectedLinks
    );

    if (!preceding) continue;

    const atom = readAtom(label[2], 0);

    if (
      !atom ||
      atom.existing ||
      atom.unsupported ||
      atom.end !== label[2].length
    ) {
      continue;
    }

    const resolved = resolveAtom(
      atom, preceding.context, index, options
    );

    if (!resolved.target) {
      skipped.push({
        line: text.slice(0, start).split('\n').length,
        reference: link.label,
        reason: resolved.reason
      });

      continue;
    }

    const oldChapter = chapterFromPath(link.target);
    const oldId = link.target.match(/#Footnote\s+(\d+)\.(\d+)/i);

    if (
      oldChapter &&
      oldId &&
      key(oldChapter) === key(preceding.context) &&
      Number(oldId[1]) === resolved.verse &&
      Number(oldId[2]) === resolved.note
    ) {
      continue;
    }

    const number = atom.shorthand
      ? atom.digits
      : `${resolved.verse}${superscript(resolved.note)}`;

    edits.push({
      start,
      end,
      before: link.raw,
      replacement: `[${label[1]} ${number}](<${resolved.target}>)`
    });
  }

  // Shorten existing footnote links when their filenames are unique.
  if (options.shortLinks !== false) {
    for (const [start, end, link] of protectedLinks) {
      const id = link.target.match(
        /\.fn(?:\.md)?#Footnote\s+(\d+)\.(\d+)/i
      );

      if (!id) continue;

      const context = chapterFromPath(link.target);

      const resolved = resolveAtom(
        {
          verse: Number(id[1]),
          note: Number(id[2])
        },
        context,
        index,
        options
      );

      if (!resolved.target || resolved.target === link.target) {
        continue;
      }

      const replacement = link.raw.startsWith('[[')
        ? `[[${resolved.target}${
            link.raw.includes('|') ? '|' + link.label : ''
          }]]`
        : `[${link.label}](<${resolved.target}>)`;

      edits.push({
        start,
        end,
        before: link.raw,
        replacement
      });
    }
  }

  let offset = 0;
  let verse = null;
  let processedUntil = 0;

  for (const line of scan.split(/(?<=\n)/)) {
    const heading = line.match(/^#{1,6}\s+Footnote\s+(\d+)\./i);
    if (heading) verse = Number(heading[1]);

    const groupHeading = line.match(
      /^#{1,6}\s+Footnotes for verse\s+(\d+)/i
    );

    if (groupHeading) verse = Number(groupHeading[1]);

    // Support both Markdown and wiki links in Verse metadata.
    const verseLine = line.match(
      /^\s*\*\*Verse:\*\*\s*(.+)/i
    );

    const verseLink = verseLine && readLink(verseLine[1], 0);

    if (verseLink) {
      const chapter = chapterFromPath(verseLink.target);
      const verseId = verseLink.target.match(/#v(\d+)$/i);

      if (chapter) current = chapter;
      if (verseId) verse = Number(verseId[1]);
    }

    if (/^\s*#|^\s*\*\*(?:Verse|Chapter):/i.test(line)) {
      offset += line.length;
      continue;
    }

    const re = /\b(notes?)(?:\s+|(?=[);,.!?]|$))/gi;
    let m;

    while ((m = re.exec(line))) {
      const begin = offset + m.index;

      if (begin < processedUntil) continue;

      if (
        protectedLinks.some(([a, b]) => begin >= a && begin < b)
      ) {
        continue;
      }

      const preceding = precedingVerseContext(
        scan, begin, protectedLinks
      );

      const source = preceding
        ? preceding.context
        : current && {
            ...current,
            verse,
            source: current
          };

      const rest = scan.slice(begin);
      const paragraphEnd = rest.search(/\r?\n\s*\r?\n|\r?\n\s*#/);

      const chunk = text.slice(
        begin,
        paragraphEnd < 0 ? text.length : begin + paragraphEnd
      );

      const chain = parseChain(chunk, m[0].length, source);

      if (
        !chain.atoms.length &&
        preceding &&
        m[1].toLowerCase() === 'note' &&
        /^(?:[);,.!?]|$)/.test(chunk.slice(m[0].length))
      ) {
        chain.atoms.push({
          start: m[0].length,
          end: m[0].length,
          raw: 'note',
          implicitNote: true,
          context: source
        });

        chain.end = m[0].length;
      }

      processedUntil = Math.max(
        processedUntil,
        begin + chain.end
      );

      if (!chain.atoms.length) {
        if (/^(?:\d|\[\d)/.test(chunk.slice(m[0].length))) {
          skipped.push({
            line: text.slice(0, begin).split('\n').length,
            reference: chunk.slice(0, 100),
            reason: 'Unsupported note notation.'
          });
        }

        continue;
      }

      if (chain.unsupported) {
        skipped.push({
          line: text.slice(0, begin).split('\n').length,
          reference: chunk.slice(0, 100),
          reason: 'Note ranges or unsupported notation; left unchanged.'
        });

        continue;
      }

      for (let i = 0; i < chain.atoms.length; i++) {
        const atom = chain.atoms[i];
        if (atom.existing) continue;

        const resolved = resolveAtom(
          atom, atom.context, index, options
        );

        if (!resolved.target) {
          skipped.push({
            line: text.slice(0, begin + atom.start).split('\n').length,
            reference: atom.raw,
            reason: resolved.reason
          });

          continue;
        }

        const singular =
          i === 0 && m[1].toLowerCase() === 'note';

        const number = atom.implicitNote
          ? ''
          : atom.shorthand
            ? atom.digits
            : `${resolved.verse}${superscript(resolved.note)}`;

        const display =
          `${singular ? m[1] + (number ? ' ' : '') : ''}${number}`;

        edits.push({
          start: begin + (singular ? 0 : atom.start),
          end: begin + atom.end,
          replacement: `[${display}](<${resolved.target}>)`,
          before: chunk.slice(
            singular ? 0 : atom.start,
            atom.end
          )
        });
      }

      re.lastIndex = Math.max(
        re.lastIndex,
        m.index + chain.end
      );
    }

    offset += line.length;
  }

  edits.sort((a, b) => a.start - b.start);

  const unique = [];

  for (const edit of edits) {
    if (
      !unique.length ||
      edit.start >= unique[unique.length - 1].end
    ) {
      unique.push(edit);
    }
  }

  let output = text;

  for (const edit of [...unique].reverse()) {
    output =
      output.slice(0, edit.start) +
      edit.replacement +
      output.slice(edit.end);
  }

  return {
    text: output,
    edits: unique,
    skipped
  };
}

function resultWindow(obsidian, app, result, preview) {
  const { Modal } = obsidian;

  class Results extends Modal {
    onOpen() {
      this.contentEl.createEl('h2', {
        text: preview
          ? 'Footnote link preview'
          : 'Footnote link results'
      });

      this.contentEl.createEl('p', {
        text:
          `${result.edits.length} ` +
          `${preview ? 'proposed changes' : 'links updated'}; ` +
          `${result.skipped.length} unresolved references.`
      });

      const lines = [];

      if (preview) {
        for (const e of result.edits) {
          lines.push(`${e.before}\n→ ${e.replacement}\n`);
        }
      }

      for (const s of result.skipped) {
        lines.push(
          `Line ${s.line}: ${s.reference}\n${s.reason}\n`
        );
      }

      const pre = this.contentEl.createEl('pre', {
        text: lines.join('\n') || (
          result.edits.length
            ? 'All detected references were resolved successfully.'
            : 'No changes needed.'
        )
      });

      pre.style.whiteSpace = 'pre-wrap';
      pre.style.maxHeight = '65vh';
      pre.style.overflow = 'auto';
    }

    onClose() {
      this.contentEl.empty();
    }
  }

  new Results(app).open();
}

async function run(tp, options, file) {
  const obsidian = tp.obsidian;
  const app = tp.app || globalThis.app;

  const view = app.workspace.getActiveViewOfType(
    obsidian.MarkdownView
  );

  if (!view || view.file?.path !== file.path || !view.editor) {
    throw new Error(
      'Open the footnote file in edit mode and run the template there.'
    );
  }

  const editor = view.editor;
  const before = editor.getValue();

  const allFiles = app.vault.getMarkdownFiles();
  const files = allFiles.filter(f => /\.fn\.md$/i.test(f.path));
  const loaded = [];

  for (let start = 0; start < files.length; start += 8) {
    const batch = files.slice(start, start + 8);

    const settled = await Promise.allSettled(
      batch.map(async f => ({
        path: f.path,
        text: f.path === file.path
          ? before
          : await app.vault.cachedRead(f)
      }))
    );

    for (const r of settled) {
      if (r.status === 'rejected') {
        throw new Error(
          `Unable to read a footnote file: ${r.reason}`
        );
      }

      loaded.push(r.value);
    }
  }

  const result = transform(
    before,
    file.path,
    indexFiles(loaded, allFiles.map(f => f.path)),
    options
  );

  if (options.preview) {
    resultWindow(obsidian, app, result, true);
    return;
  }

  if (
    editor.getValue() !== before ||
    view.file?.path !== file.path ||
    app.workspace.getActiveFile()?.path !== file.path
  ) {
    throw new Error(
      'The document changed while scanning. Run the template again.'
    );
  }

  if (result.edits.length) {
    editor.transaction({
      changes: result.edits.map(e => ({
        from: editor.offsetToPos(e.start),
        to: editor.offsetToPos(e.end),
        text: e.replacement
      }))
    });
  }

  console.info(
    'Footnote links:',
    result.edits.length,
    'Unresolved:',
    result.skipped
  );

  new obsidian.Notice(
    `${result.edits.length} footnote links updated; ` +
    `${result.skipped.length} unresolved.`,
    8000
  );

  resultWindow(obsidian, app, result, false);
}

module.exports = async function link_footnote_references(
  tp,
  options = {}
) {
  const obsidian = tp.obsidian;
  const app = tp?.app || globalThis.app;
  const file = app?.workspace.getActiveFile();

  if (!file) {
    new obsidian.Notice(
      'Footnote linker: open your footnote file first.',
      12000
    );

    return '';
  }

  const initialView = app.workspace.getActiveViewOfType(
    obsidian.MarkdownView
  );

  const initialEditor =
    initialView?.file?.path === file.path
      ? initialView.editor
      : null;

  const selection =
    tp?.file?.selection?.() ??
    initialEditor?.getSelection?.() ??
    '';

  let snapshot = null;

  if (
    initialEditor &&
    selection &&
    initialEditor.getCursor &&
    initialEditor.posToOffset
  ) {
    const original = initialEditor.getValue();

    const from = initialEditor.posToOffset(
      initialEditor.getCursor('from')
    );

    const to = initialEditor.posToOffset(
      initialEditor.getCursor('to')
    );

    if (original.slice(from, to) === selection) {
      snapshot = {
        original,
        from,
        to,
        deleted: original.slice(0, from) + original.slice(to)
      };
    }
  }

  new obsidian.Notice(
    `Footnote linker v3 started: ${file.basename || file.path}`,
    10000
  );

  let launched = false;
  let fallback;

  const launch = async () => {
    if (launched) return;
    launched = true;

    if (fallback !== undefined) {
      clearTimeout(fallback);
    }

    try {
      if (
        snapshot &&
        initialView.file?.path === file.path &&
        app.workspace.getActiveFile()?.path === file.path
      ) {
        const now = initialEditor.getValue();

        if (
          now === snapshot.deleted ||
          now === snapshot.deleted + '\n' ||
          now === snapshot.deleted + '\r\n'
        ) {
          initialEditor.transaction({
            changes: [{
              from: initialEditor.offsetToPos(snapshot.from),
              to: initialEditor.offsetToPos(snapshot.from),
              text: selection
            }]
          });
        }
      }

      await run(tp || { app, obsidian }, options, file);
    } catch (err) {
      console.error(err);

      new obsidian.Notice(
        `Footnote linker: ${err.message}`,
        15000
      );

      resultWindow(
        obsidian,
        app,
        {
          edits: [],
          skipped: [{
            line: '?',
            reference: 'The linker stopped before editing.',
            reason: err.message
          }]
        },
        false
      );
    }
  };

  fallback = setTimeout(launch, 800);

  if (tp?.hooks?.on_all_templates_executed) {
    try {
      tp.hooks.on_all_templates_executed(launch);
    } catch (err) {
      console.warn(
        'Footnote linker: using delayed start.',
        err
      );
    }
  }

  return selection;
};

module.exports._test = {
  indexFiles,
 transform,
  chapterFromPath
};